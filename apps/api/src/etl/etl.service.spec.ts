import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ClientesService } from '../clientes/clientes.service';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { CargadorClientes, ResultadoCarga } from './cargador';
import { EtlService, OpcionesImportacion } from './etl.service';
import { ArchivoInvalidoError, leerHojaClientes } from './lector-excel';
import { enmascarar, escribirReporte } from './reporte';
import { ReporteEtl } from './tipos';

// Servicio de importación y reporte (Actividad 5, Tarea 10): integración con la base de pruebas (*_test)
// y el Excel ficticio. Los clientes del fixture se borran al terminar cada prueba (por asesor y por CURP).
jest.setTimeout(120_000);

const FIXTURE = resolve(
  __dirname,
  '../../../../test/fixtures/etl/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
);
const HOY = new Date(Date.UTC(2026, 10, 16));
const IDS_RECHAZADOS = [44, 45, 46, 47, 48, 49, 50, 52, 53, 54];

describeConBd('EtlService.importar (integración con la base de pruebas)', () => {
  let ctx: AppConBd;
  let marco: UsuarioPrueba;
  let ana: UsuarioPrueba;
  let ejecutor: UsuarioPrueba;
  let equivalencias: Record<string, string>;
  let servicio: EtlService;
  let cargador: CargadorClientes;
  let buffer: Buffer;
  let curpsCrudas: string[];

  const importar = (extra: Partial<OpcionesImportacion> = {}, datos: Buffer = buffer) =>
    servicio.importar(datos, {
      nombreArchivo: 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
      ejecutorId: ejecutor.id,
      modo: 'api',
      equivalencias,
      tamanoLote: 10,
      hoy: HOY,
      ...extra,
    });
  const porId = (r: ReporteEtl, id: number) => r.renglones.find((x) => x.idExcel === id)!;
  const cargadosEnBase = async () =>
    Number(
      (
        await ctx.ds.query<{ n: string }[]>(
          `SELECT count(*) AS n FROM clientes WHERE asesor_id = ANY($1)`,
          [[marco.id, ana.id]],
        )
      )[0].n,
    );
  async function borrarClientesDelFixture() {
    const donde = `SELECT id FROM clientes WHERE asesor_id = ANY($1) OR curp = ANY($2)`;
    const parametros = [[marco.id, ana.id], curpsCrudas];
    await ctx.ds.query(`DELETE FROM etapas_tramite WHERE cliente_id IN (${donde})`, parametros);
    await ctx.ds.query(
      `DELETE FROM clientes WHERE asesor_id = ANY($1) OR curp = ANY($2)`,
      parametros,
    );
  }

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    marco = await crearUsuarioPrueba(ctx.ds, 'asesor');
    ana = await crearUsuarioPrueba(ctx.ds, 'asesor');
    ejecutor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    const correo = async (u: UsuarioPrueba) =>
      (
        await ctx.ds.query<{ correo_electronico: string }[]>(
          `SELECT correo_electronico FROM usuarios WHERE id = $1`,
          [u.id],
        )
      )[0].correo_electronico;
    equivalencias = {
      'Lic. Marco Hernández': await correo(marco),
      'Lic. Ana Hernández': await correo(ana),
    };
    buffer = readFileSync(FIXTURE);
    curpsCrudas = (await leerHojaClientes(buffer)).renglones
      .map((r) =>
        String(r.celdas['CURP'] ?? '')
          .replace(/[\s-]/g, '')
          .toUpperCase(),
      )
      .filter((c) => c.length > 0);
    cargador = new CargadorClientes(ctx.ds, ctx.app.get(ClientesService, { strict: false }));
    servicio = new EtlService(ctx.ds, cargador);
    await borrarClientesDelFixture();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await borrarClientesDelFixture();
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-275 totales_con_fixture: leídos 54, cargados 44 y rechazados 10', async () => {
    const r = await importar();
    expect(r.totales).toMatchObject({
      leidos: 54,
      cargados: 44,
      rechazados: 10,
      duplicadosEnArchivo: 2,
      yaExistian: 0,
      lotes: 5, // 44 válidos en lotes de 10
      lotesDegradados: 0,
    });
    expect(r.renglones).toHaveLength(54);
    expect(r.renglones.map((x) => x.fila)).toEqual(Array.from({ length: 54 }, (_, i) => 6 + i));
    const rechazados = r.renglones.filter((x) => x.clase === 'rechazado').map((x) => x.idExcel);
    expect(rechazados).toEqual(IDS_RECHAZADOS);
    expect(await cargadosEnBase()).toBe(44);
  });

  it('CP-275 sin tamanoLote el lote es de 25 (44 válidos dan 2 lotes)', async () => {
    const r = await importar({ tamanoLote: undefined });
    expect(r.totales.lotes).toBe(2);
  });

  it('CP-275 cada renglón dice su fila, ID, clase y motivos; los rechazos traen al menos un motivo', async () => {
    const r = await importar();
    for (const renglon of r.renglones) {
      expect(renglon.idExcel).toEqual(renglon.fila - 5);
      if (renglon.clase === 'rechazado') expect(renglon.rechazos.length).toBeGreaterThan(0);
      else expect(renglon.rechazos).toEqual([]);
    }
    expect(porId(r, 53).rechazos.join(' ')).toContain('fila 17');
    expect(porId(r, 54).rechazos.join(' ')).toContain('fila 25');
    expect(porId(r, 49).rechazos.join(' ')).toMatch(/asesor sin equivalencia/i);
    expect(porId(r, 3).ajustes.length).toBeGreaterThan(0);
  });

  it('CP-276 conciliacion_ok: leídos = cargados + rechazados y el conteo en base coincide con los CURP cargados', async () => {
    const r = await importar();
    expect(r.totales.leidos).toBe(r.totales.cargados + r.totales.rechazados);
    expect(r.conciliacion.ok).toBe(true);
    expect(r.conciliacion.detalle).toMatch(/44/);
    expect(await cargadosEnBase()).toBe(r.totales.cargados);
  });

  it('CP-277 conciliacion_falla_se_marca: si la base no coincide, el reporte lo indica', async () => {
    // Un cargador que dice haber cargado pero no escribe nada en la base.
    const mentiroso = {
      cargarLotes: jest.fn(
        (validos: { datos: { curp: string } | null }[]): Promise<ResultadoCarga> =>
          Promise.resolve({
            cargados: validos.map((v) => v.datos!.curp),
            rechazados: [],
            lotes: 5,
            lotesDegradados: 0,
          }),
      ),
    } as unknown as CargadorClientes;
    const r = await new EtlService(ctx.ds, mentiroso).importar(buffer, {
      nombreArchivo: 'x.xlsx',
      ejecutorId: ejecutor.id,
      modo: 'api',
      equivalencias,
      hoy: HOY,
    });
    expect(r.totales.cargados).toBe(44);
    expect(r.conciliacion.ok).toBe(false);
    expect(r.conciliacion.detalle).toMatch(/no coincide/i);
  });

  it('CP-318 un renglón que el cargador rechaza se reporta como rechazado y los totales siguen cuadrando', async () => {
    let filaRechazada = 0;
    const real = cargador.cargarLotes.bind(cargador);
    jest.spyOn(cargador, 'cargarLotes').mockImplementation(async (validos, opciones) => {
      filaRechazada = validos[0].fila;
      const resultado = await real(validos.slice(1), opciones);
      resultado.rechazados.push({
        fila: filaRechazada,
        motivo: 'La base de datos rechazó el renglón.',
      });
      return resultado;
    });
    const r = await importar();
    expect(r.totales).toMatchObject({ leidos: 54, cargados: 43, rechazados: 11 });
    const renglon = r.renglones.find((x) => x.fila === filaRechazada)!;
    expect(renglon.clase).toBe('rechazado');
    expect(renglon.rechazos).toContain('La base de datos rechazó el renglón.');
    expect(r.conciliacion.ok).toBe(true);
  });

  it('CP-278 enmascara_curp_y_nss: solo se ven los últimos 4 caracteres y la longitud se conserva', () => {
    const nss = enmascarar('99446026195');
    expect(nss).toBe('•••••••6195');
    expect(nss).toHaveLength(11);
    expect(enmascarar('MIAR610609HDFRNF68')).toBe(`${'•'.repeat(14)}NF68`);
    expect(enmascarar('abc')).toBe('•••'); // demasiado corto para mostrar algo
    expect(enmascarar('1234')).toBe('••••');
    expect(enmascarar('')).toBe('');
  });

  it('CP-278 el reporte nunca trae una CURP ni un NSS completos; sí los últimos 4', async () => {
    const r = await importar();
    const json = JSON.stringify(r);
    const { renglones } = await leerHojaClientes(buffer);
    for (const crudo of renglones) {
      const curp = String(crudo.celdas['CURP'] ?? '')
        .replace(/[\s-]/g, '')
        .toUpperCase();
      const nss = String(crudo.celdas['NSS'] ?? '').replace(/\D/g, '');
      if (curp.length >= 8) expect(json).not.toContain(curp);
      if (nss.length >= 6) expect(json).not.toContain(nss);
    }
    const id3 = renglones.find((x) => x.celdas['ID'] === 3)!;
    const curp3 = String(id3.celdas['CURP']).toUpperCase();
    expect(porId(r, 3).curp).toBe(`${'•'.repeat(curp3.length - 4)}${curp3.slice(-4)}`);
    expect(porId(r, 3).nss).toMatch(/^•+\d{4}$/);
    // Un renglón rechazado por CURP inválida también va enmascarado.
    expect(porId(r, 44).curp).toMatch(/^•+/);
    expect(porId(r, 44).curp).not.toBeNull();
  });

  it('CP-279 reporte_y_csv_en_disco: se escriben reporte.json y rechazados.csv con una fila por rechazo', async () => {
    const r = await importar();
    const carpeta = mkdtempSync(join(tmpdir(), 'etl-reporte-'));
    try {
      const salida = join(carpeta, 'sub', 'corrida');
      const { json, csv } = await escribirReporte(salida, r);
      expect(json).toBe(join(salida, 'reporte.json'));
      expect(csv).toBe(join(salida, 'rechazados.csv'));
      expect(JSON.parse(readFileSync(json, 'utf8'))).toEqual(JSON.parse(JSON.stringify(r)));

      const lineas = readFileSync(csv, 'utf8')
        .replace(String.fromCharCode(0xfeff), '')
        .trim()
        .split(/\r?\n/);
      expect(lineas[0]).toBe('fila,id_excel,curp,nss,motivos');
      expect(lineas).toHaveLength(1 + r.totales.rechazados);
      // Una fila por rechazo, con el ID y su motivo; nada de CURP ni NSS completos.
      const lineaDe44 = lineas.find((l) => l.startsWith('49,44,'))!;
      expect(lineaDe44).toMatch(/formato/);
      const lineaDe53 = lineas.find((l) => l.startsWith('58,53,'))!;
      expect(lineaDe53).toContain('fila 17');
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });

  it('CP-279 el CSV cita los campos con comas, comillas o saltos de línea', async () => {
    const r = await importar();
    r.renglones.find((x) => x.idExcel === 44)!.rechazos = ['CURP: dice "hola", y\nsigue'];
    const carpeta = mkdtempSync(join(tmpdir(), 'etl-reporte-'));
    try {
      const { csv } = await escribirReporte(carpeta, r);
      const texto = readFileSync(csv, 'utf8');
      expect(texto).toContain('"CURP: dice ""hola"", y\nsigue"');
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });

  it('CP-280 huella_sha256_del_archivo: la cabecera trae el SHA-256 del archivo y datos de la corrida', async () => {
    const r = await importar({ modo: 'comando' });
    expect(r.cabecera.huellaSha256).toBe(createHash('sha256').update(buffer).digest('hex'));
    expect(r.cabecera.huellaSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.cabecera).toMatchObject({
      archivo: 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
      modo: 'comando',
      ejecutor: ejecutor.id,
      simulacro: false,
    });
    expect(Date.parse(r.cabecera.inicio)).not.toBeNaN();
    expect(Date.parse(r.cabecera.fin)).toBeGreaterThanOrEqual(Date.parse(r.cabecera.inicio));
  });

  it('CP-281 columnas_no_migradas: lista los 6 documentos (CJ a CO) y las 4 columnas que no se cargan', async () => {
    const r = await importar({ simulacro: true });
    const { encabezados } = await leerHojaClientes(buffer);
    const documentos = encabezados.slice(87);
    expect(documentos).toHaveLength(6);
    const columnas = r.columnasNoMigradas.map((c) => c.columna);
    expect(columnas).toEqual([
      'ID',
      'Edad',
      'Días desde alta',
      'Fecha compromiso total',
      ...documentos,
    ]);
    expect(r.columnasNoMigradas.every((c) => c.motivo.length > 0)).toBe(true);
    expect(r.columnasNoMigradas.slice(4).every((c) => /documento/i.test(c.motivo))).toBe(true);
  });

  it('CP-282 segunda_corrida_idempotente: 0 cargados y todo lo ya cargado se rechaza como "ya existe"', async () => {
    await importar();
    const r = await importar();
    expect(r.totales.cargados).toBe(0);
    expect(r.totales.rechazados).toBe(54);
    // Los 44 cargados la primera vez y los dos duplicados, cuya CURP o NSS ya está en la base.
    expect(r.totales.yaExistian).toBe(46);
    expect(r.totales.duplicadosEnArchivo).toBe(0);
    expect(await cargadosEnBase()).toBe(44);
    expect(porId(r, 3).rechazos.join(' ')).toMatch(/ya existe/i);
    expect(r.conciliacion.ok).toBe(true);
  });

  it('CP-317 reporte_cuenta_pendientes: pendientes de captura 44, objetivo asumido 44 y nombres divididos', async () => {
    const r = await importar();
    expect(r.totales.pendientesDeCaptura).toBe(44);
    expect(r.totales.objetivoAsumido).toBe(44);
    expect(r.nombresDivididos).toHaveLength(44);
    expect(r.nombresDivididos[0]).toMatch(/^Fila 6: Leticia \/ May \/ Uc$/);
  });

  it('CP-319 conteos_excluyen_rutinarios: conAjustes y conAdvertencias no cuentan lo rutinario o estructural', async () => {
    const r = await importar();
    // Sin nombre_dividido, avance_por_iniciar_a_10 ni el alias Mixto/revisar: quedan los renglones con
    // un saneo real (IDs 3, 7, 10, 13, 16, 19, 22, 25 y 31).
    expect(r.totales.conAjustes).toBe(9);
    const conAjustes = r.renglones
      .filter(
        (x) =>
          x.clase === 'cargado' &&
          x.ajustes.some(
            (m) =>
              !/nombre_dividido|avance_por_iniciar_a_10|Ley probable: catalogo_normalizado/.test(m),
          ),
      )
      .map((x) => x.idExcel);
    expect(conAjustes).toEqual([3, 7, 10, 13, 16, 19, 22, 25, 31]);
    // Advertencias reales: IDs 33, 34, 38, 39 (etapa Bloqueado), 40 y 42; sin las dos estructurales.
    expect(r.totales.conAdvertencias).toBe(6);
    const conAdvertencias = r.renglones
      .filter(
        (x) =>
          x.clase === 'cargado' &&
          x.advertencias.some((m) => !/campos_pendientes_de_captura|objetivo_asumido/.test(m)),
      )
      .map((x) => x.idExcel);
    expect(conAdvertencias).toEqual([33, 34, 38, 39, 40, 42]);
  });

  it('CP-319 resumenPorCodigo sí incluye los códigos rutinarios y cuenta renglones cargados por código', async () => {
    const r = await importar();
    expect(r.resumenPorCodigo['nombre_dividido']).toBe(44);
    expect(r.resumenPorCodigo['campos_pendientes_de_captura']).toBe(44);
    expect(r.resumenPorCodigo['objetivo_asumido']).toBe(44);
    expect(r.resumenPorCodigo['posible_duplicado']).toBe(1);
    expect(r.resumenPorCodigo['semanas_no_numericas']).toBe(1);
    expect(r.resumenPorCodigo['bloqueado_sin_motivo']).toBe(1);
    expect(r.resumenPorCodigo['avance_por_iniciar_a_10']).toBeGreaterThan(0);
    // Solo renglones cargados: no aparecen los códigos de los rechazados.
    expect(Object.keys(r.resumenPorCodigo).every((c) => /^[a-z]+(_[a-z0-9]+)+$/.test(c))).toBe(
      true,
    );
  });

  it('CP-320 simulacro_no_guarda: mismos totales que la carga real y la base queda igual', async () => {
    const simulado = await importar({ simulacro: true });
    expect(await cargadosEnBase()).toBe(0);
    expect(simulado.cabecera.simulacro).toBe(true);
    expect(simulado.totales).toMatchObject({ leidos: 54, cargados: 44, rechazados: 10, lotes: 5 });
    expect(simulado.conciliacion.ok).toBe(true);
    expect(simulado.conciliacion.detalle).toMatch(/simulacro/i);

    const real = await importar();
    expect(real.totales).toEqual(simulado.totales);
    expect(real.renglones).toEqual(simulado.renglones);
  });

  it('CP-321 archivo_invalido_no_carga: un archivo que no es Excel lanza ArchivoInvalidoError y no toca la base', async () => {
    await expect(importar({}, Buffer.from('esto no es un excel'))).rejects.toBeInstanceOf(
      ArchivoInvalidoError,
    );
    expect(await cargadosEnBase()).toBe(0);
  });
});
