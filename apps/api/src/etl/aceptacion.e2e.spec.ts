import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { borrarClientesConEtapas, tomarBloqueoEtl } from '../common/testing/bloqueo-etl';
import { ROL_ID } from '../common/auth/roles-sistema';
import {
  crearUsuarioPrueba,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import {
  armarMarkdown,
  Defecto,
  leerCsv,
  leerDefectos,
  resultadoDe,
} from '../common/testing/defectos';
import { tokenDe } from '../common/testing/tokens';
import { ejecutarCli } from './cli';
import { leerHojaClientes } from './lector-excel';
import { esRutinario } from './reporte';
import { ReporteEtl } from './tipos';

// Aceptación de la importación con el Excel ficticio (Actividad 5, Tarea 13), de punta a punta con la
// aplicación real y la base de pruebas: los 2 asesores se crean con los correos del JSON de equivalencias
// del fixture. Solo datos ficticios. Con ETL_EVIDENCIA=1 además se regenera docs/etl-corrida-ficticia/.
jest.setTimeout(300_000);

const RAIZ = resolve(__dirname, '../../../..');
const FIXTURES = join(RAIZ, 'test/fixtures/etl');
const FIXTURE = join(FIXTURES, 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx');
const JSON_EQUIVALENCIAS = join(FIXTURES, 'equivalencias-asesores.json');
const EVIDENCIA = join(RAIZ, 'docs/etl-corrida-ficticia');
const IDS_RECHAZADOS = [44, 45, 46, 47, 48, 49, 50, 52, 53, 54];
const ESTRUCTURALES = /campos_pendientes_de_captura|objetivo_asumido/;
const itEvidencia = process.env.ETL_EVIDENCIA === '1' ? it : it.skip;

type RenglonReporte = ReporteEtl['renglones'][number];

describeConBd('Aceptación de la importación con el Excel ficticio', () => {
  let ctx: AppConBd;
  let liberarBloqueo: (() => Promise<void>) | undefined;
  let supervisor: UsuarioPrueba;
  let marco: UsuarioPrueba;
  let ana: UsuarioPrueba;
  let carpeta: string;
  let curpsPorId: Map<number, string>;
  let correos: string[];
  const fixture = readFileSync(FIXTURE);
  const equivalencias = JSON.parse(readFileSync(JSON_EQUIVALENCIAS, 'utf8')) as Record<
    string,
    string
  >;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

  async function importar(consulta = '', token = t(supervisor)) {
    const form = new FormData();
    form.append(
      'archivo',
      new Blob([new Uint8Array(fixture)]),
      'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
    );
    const respuesta = await fetch(`${ctx.base}/etl/importaciones${consulta}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return { estado: respuesta.status, reporte: (await respuesta.json()) as ReporteEtl };
  }
  async function pedir(ruta: string, token: string) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { estado: respuesta.status, json: (await respuesta.json()) as unknown };
  }
  const porId = (r: ReporteEtl, id: number): RenglonReporte =>
    r.renglones.find((x) => x.idExcel === id)!;
  const contar = async (tabla: 'clientes' | 'etapas_tramite') =>
    Number(
      (
        await ctx.ds.query<{ n: string }[]>(
          tabla === 'clientes'
            ? `SELECT count(*) AS n FROM clientes WHERE asesor_id = ANY($1)`
            : `SELECT count(*) AS n FROM etapas_tramite WHERE cliente_id IN (SELECT id FROM clientes WHERE asesor_id = ANY($1))`,
          [[marco.id, ana.id]],
        )
      )[0].n,
    );
  const clientePorId = async (id: number) =>
    (
      await ctx.ds.query<Record<string, string>[]>(
        `SELECT c.*, to_char(c.fecha_ingreso, 'YYYY-MM-DD') AS ingreso, to_char(c.fecha_nacimiento, 'YYYY-MM-DD') AS nacimiento,
                r.nombre AS regimen, a.nombre AS afore
           FROM clientes c
           JOIN regimen_principal r ON r.id = c.regimen_id
           JOIN afore a ON a.id = c.afore_id
          WHERE c.curp = $1`,
        [curpsPorId.get(id)],
      )
    )[0];

  async function borrarTodo() {
    await borrarClientesConEtapas(
      ctx.ds,
      `asesor_id IN (SELECT id FROM usuarios WHERE lower(correo_electronico) = ANY($1)) OR curp = ANY($2)`,
      [correos, [...curpsPorId.values()]],
    );
    await ctx.ds.query(`DELETE FROM usuarios WHERE lower(correo_electronico) = ANY($1)`, [correos]);
  }
  // Los dos asesores del Excel, con los correos del JSON de equivalencias.
  async function crearAsesor(correo: string, nombre: string): Promise<UsuarioPrueba> {
    const id = randomUUID();
    await ctx.ds.query(
      `INSERT INTO usuarios (id, rol_id, nombre, apellido_paterno, apellido_materno, correo_electronico,
         contrasena_hash, activo, fecha_creacion)
       VALUES ($1, $2, $3, 'Hernández', 'Ficticio', $4, 'hash-ficticio-no-valido', true, now())`,
      [id, ROL_ID.asesor, nombre, correo],
    );
    return { id, rol: 'asesor' };
  }

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    liberarBloqueo = await tomarBloqueoEtl(ctx.ds);
    correos = Object.values(equivalencias).map((c) => c.toLowerCase());
    curpsPorId = new Map(
      (await leerHojaClientes(fixture)).renglones.map((r) => [
        r.celdas['ID'] as number,
        String(r.celdas['CURP'] ?? '')
          .replace(/[\s-]/g, '')
          .toUpperCase(),
      ]),
    );
    await borrarTodo();
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    marco = await crearAsesor(equivalencias['Lic. Marco Hernández'], 'Marco');
    ana = await crearAsesor(equivalencias['Lic. Ana Hernández'], 'Ana');
    carpeta = mkdtempSync(join(tmpdir(), 'etl-aceptacion-'));
    process.env.ETL_EQUIVALENCIAS = JSON_EQUIVALENCIAS;
    process.env.ETL_SALIDA = join(carpeta, 'salida');
  });

  // Cada prueba parte de la base sin clientes del fixture (los asesores se conservan).
  afterEach(async () => {
    await borrarClientesConEtapas(ctx.ds, `asesor_id = ANY($1) OR curp = ANY($2)`, [
      [marco.id, ana.id],
      [...curpsPorId.values()],
    ]);
  });

  afterAll(async () => {
    delete process.env.ETL_EQUIVALENCIAS;
    delete process.env.ETL_SALIDA;
    if (carpeta) rmSync(carpeta, { recursive: true, force: true });
    if (!ctx) return;
    await borrarTodo();
    await limpiarDatosClientes(ctx.ds);
    await liberarBloqueo?.();
    await ctx.app.close();
  });

  it('CP-297 corrida_completa: 54 leídos, 44 cargados y 10 rechazados, con la base cuadrada', async () => {
    const { estado, reporte } = await importar();
    expect(estado).toBe(200);
    expect(reporte.totales).toMatchObject({
      leidos: 54,
      cargados: 44,
      rechazados: 10,
      duplicadosEnArchivo: 2,
      yaExistian: 0,
      lotes: 2,
      lotesDegradados: 0,
      pendientesDeCaptura: 44,
      objetivoAsumido: 44,
    });
    expect(reporte.renglones.filter((r) => r.clase === 'rechazado').map((r) => r.idExcel)).toEqual(
      IDS_RECHAZADOS,
    );
    expect(reporte.conciliacion.ok).toBe(true);
    expect(await contar('clientes')).toBe(44);
    expect(await contar('etapas_tramite')).toBe(44 * 16);

    // Cada cliente queda con el asesor de su renglón del Excel.
    const { renglones } = await leerHojaClientes(fixture);
    const cargados = new Set(
      reporte.renglones.filter((r) => r.clase === 'cargado').map((r) => r.idExcel),
    );
    const deMarco = renglones.filter(
      (r) => cargados.has(r.celdas['ID'] as number) && /marco/i.test(String(r.celdas['Asesor'])),
    ).length;
    const enBase = await ctx.ds.query<{ asesor_id: string; n: string }[]>(
      `SELECT asesor_id, count(*) AS n FROM clientes WHERE asesor_id = ANY($1) GROUP BY asesor_id`,
      [[marco.id, ana.id]],
    );
    const de = (id: string) => Number(enBase.find((f) => f.asesor_id === id)?.n ?? 0);
    expect([de(marco.id), de(ana.id)]).toEqual([deMarco, 44 - deMarco]);
  });

  it('CP-298 defectos_saneables_se_cargan_con_ajustes: los IDs 3, 7, 10, 13, 16, 19, 22, 25, 28 y 31', async () => {
    const { reporte } = await importar();
    for (const id of [3, 7, 10, 13, 16, 19, 22, 25, 28, 31]) {
      expect([id, porId(reporte, id).clase]).toEqual([id, 'cargado']);
    }
    // Nueve dejan un ajuste anotado; el ID 28 (asesor sin Lic. y NSS como número) se normaliza en silencio.
    for (const id of [3, 7, 10, 13, 16, 19, 22, 25, 31]) {
      expect([id, porId(reporte, id).ajustes.some((m) => !esRutinario(m))]).toEqual([id, true]);
    }
    expect(porId(reporte, 28).ajustes.some((m) => !esRutinario(m))).toBe(false);
    expect(reporte.totales.conAjustes).toBe(9);

    // Y en la base quedó el dato limpio.
    expect(await clientePorId(3)).toMatchObject({
      nombre: 'Rubén',
      apellido_paterno: 'Jiménez',
      apellido_materno: 'Euán',
      telefono: '9876628360',
    });
    expect(await clientePorId(7)).toMatchObject({
      nombre: 'Esteban',
      apellido_paterno: 'Torres',
      apellido_materno: 'Aguilar',
      ingreso: '2025-03-20',
    });
    expect(await clientePorId(10)).toMatchObject({
      curp: 'MIAR610609HDFRNF68',
      correo_electronico: 'manuel.diaz.90@ejemplo.test',
    });
    // Sin acentos en el Excel: la ETL no inventa acentos.
    expect(await clientePorId(13)).toMatchObject({ nombre: 'Monica', regimen: 'IMSS' });
    expect(await clientePorId(16)).toMatchObject({
      curp: 'QAQD760716MOCPJXE8',
      nss: '99033042845',
    });
    expect(await clientePorId(19)).toMatchObject({ telefono: '9986079113', nss: '99346352136' });
    expect(await clientePorId(22)).toMatchObject({ telefono: '9841994569', ingreso: '2025-08-16' });
    expect(await clientePorId(25)).toMatchObject({
      nacimiento: '1968-05-03',
      afore: 'XXI Banorte',
    });
    expect(await clientePorId(28)).toMatchObject({ asesor_id: marco.id, nss: '99446026195' });
    expect(await clientePorId(31)).toMatchObject({ telefono: '9988290920', ingreso: '2025-11-19' });
  });

  it('CP-299 advertencias_esperadas: IDs 33, 34, 38, 40, 42 y el cliente con etapa Bloqueado; los 44 cargados llevan las dos marcas', async () => {
    const { reporte } = await importar();
    const avisa = (id: number, codigo: string) =>
      porId(reporte, id).advertencias.some((m) => m.includes(codigo));
    expect(avisa(33, 'posible_duplicado')).toBe(true);
    expect(avisa(34, 'semanas_no_numericas')).toBe(true);
    expect(avisa(38, 'avance_fuera_de_rango')).toBe(true);
    expect(avisa(39, 'bloqueado_sin_motivo')).toBe(true);
    expect(avisa(40, 'ley_desconocido')).toBe(true);
    expect(avisa(42, 'avance_no_multiplo_de_10')).toBe(true);
    const conAvisos = reporte.renglones
      .filter((r) => r.clase === 'cargado' && r.advertencias.some((m) => !ESTRUCTURALES.test(m)))
      .map((r) => r.idExcel);
    expect(conAvisos).toEqual([33, 34, 38, 39, 40, 42]);
    expect(reporte.totales.conAdvertencias).toBe(6);
    for (const r of reporte.renglones.filter((x) => x.clase === 'cargado')) {
      expect(r.advertencias.some((m) => m.includes('campos_pendientes_de_captura'))).toBe(true);
      expect(r.advertencias.some((m) => m.includes('objetivo_asumido'))).toBe(true);
    }
    expect(reporte.resumenPorCodigo['campos_pendientes_de_captura']).toBe(44);
  });

  it('CP-300 rechazos_con_motivo: cada ID rechazado trae un motivo legible y sin datos personales', async () => {
    const { reporte } = await importar();
    const esperado: Record<number, RegExp> = {
      44: /CURP.*formato/,
      45: /CURP.*fecha de nacimiento que no existe/,
      46: /Fecha de nacimiento/,
      47: /NSS.*11 dígitos/,
      48: /Nombre del cliente.*vac/,
      49: /Asesor sin equivalencia/,
      50: /Etapa 1.*estatus/,
      52: /Semanas IMSS reconocidas/,
      53: /CURP duplicado en el archivo.*fila 17/,
      54: /NSS duplicado en el archivo.*fila 25/,
    };
    for (const id of IDS_RECHAZADOS) {
      const r = porId(reporte, id);
      expect([id, r.clase]).toEqual([id, 'rechazado']);
      expect(r.rechazos.length).toBeGreaterThan(0);
      expect(r.rechazos.join(' | ')).toMatch(esperado[id]);
      expect(r.rechazos.every((m) => m.length >= 15)).toBe(true);
    }
    for (const [id, curp] of curpsPorId) {
      if (curp.length >= 8) expect(JSON.stringify(porId(reporte, id))).not.toContain(curp);
    }
  });

  it('CP-301 segunda_corrida: 0 cargados y todo lo ya cargado se rechaza como "ya existe" (46)', async () => {
    const primera = await importar();
    expect(primera.reporte.totales.cargados).toBe(44);
    const { estado, reporte } = await importar();
    expect(estado).toBe(200);
    expect(reporte.totales).toMatchObject({
      leidos: 54,
      cargados: 0,
      rechazados: 54,
      yaExistian: 46, // los 44 cargados y los IDs 53 y 54, cuya CURP o NSS ya está en la base
      duplicadosEnArchivo: 0,
    });
    expect(reporte.conciliacion.ok).toBe(true);
    expect(await contar('clientes')).toBe(44);
    expect(await contar('etapas_tramite')).toBe(44 * 16);
  });

  it('CP-302 simulacro_sin_cambios: mismos totales que la carga real y la base intacta', async () => {
    const antes = [await contar('clientes'), await contar('etapas_tramite')];
    const simulado = await importar('?simulacro=true');
    expect(simulado.reporte.cabecera.simulacro).toBe(true);
    expect([await contar('clientes'), await contar('etapas_tramite')]).toEqual(antes);

    const real = await importar();
    expect(real.reporte.totales).toEqual(simulado.reporte.totales);
    expect(real.reporte.renglones).toEqual(simulado.reporte.renglones);
    expect(await contar('clientes')).toBe(44);
  });

  it('CP-303 catalogo_de_defectos_cuadra: cada fila de defectos-sembrados.csv se refleja en el reporte según su clase', async () => {
    const { reporte } = await importar();
    const defectos: Defecto[] = leerDefectos(
      readFileSync(join(FIXTURES, 'defectos-sembrados.csv'), 'utf8'),
    );
    expect(defectos).toHaveLength(36);
    const fallas = defectos
      .map((d) => ({ d, ...resultadoDe(d, porId(reporte, d.id)) }))
      .filter((x) => !x.coincide)
      .map((x) => `${x.d.id} ${x.d.columna} (${x.d.clase}): ${x.resultado}`);
    expect(fallas).toEqual([]);
    // Los defectos de rechazo y duplicado son exactamente los 10 renglones rechazados.
    const rechazados = [
      ...new Set(
        defectos.filter((d) => d.clase === 'rechazo' || d.clase === 'duplicado').map((d) => d.id),
      ),
    ].sort((a, b) => a - b);
    expect(rechazados).toEqual(IDS_RECHAZADOS);
  });

  it('CP-304 clientes_cargados_se_ven_con_la_api_existente: la lista, las 16 etapas y el alcance por asesor siguen funcionando', async () => {
    await importar();
    const lista = await pedir('/clientes', t(supervisor));
    const curps = new Set((lista.json as { curp: string }[]).map((c) => c.curp));
    const cargados = [...curpsPorId.entries()].filter(([id]) => !IDS_RECHAZADOS.includes(id));
    expect(cargados).toHaveLength(44);
    for (const [, curp] of cargados) expect(curps.has(curp)).toBe(true);

    // Un asesor ve solo los suyos.
    const deMarco = await pedir('/clientes', t(marco));
    const ids = (deMarco.json as { asesor_id: string }[]).map((c) => c.asesor_id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id === marco.id)).toBe(true);

    // Las 16 etapas de un cliente, con su avance global, por el servicio de etapas existente.
    const cliente = await clientePorId(3);
    const etapas = await pedir(`/clientes/${cliente.id}/etapas`, t(supervisor));
    expect(etapas.estado).toBe(200);
    const cuerpo = etapas.json as { avance_global: number; etapas: { numero_paso: number }[] };
    expect(cuerpo.etapas.map((e) => e.numero_paso)).toEqual(
      Array.from({ length: 16 }, (_, i) => i),
    );
    expect(cuerpo.avance_global).toBeGreaterThanOrEqual(0);
    expect(cuerpo.avance_global).toBeLessThanOrEqual(100);
  });

  it('CP-346 evidencia_en_docs: docs/etl-corrida-ficticia trae las tres corridas y la comparación de defectos', () => {
    const leer = (ruta: string) => readFileSync(join(EVIDENCIA, ruta), 'utf8');
    const reporte = (ruta: string) => JSON.parse(leer(ruta)) as ReporteEtl;

    // Primera corrida real, con el comando.
    const primera = reporte('reporte.json');
    expect(primera.cabecera).toMatchObject({ modo: 'comando', simulacro: false });
    expect(primera.totales).toMatchObject({ leidos: 54, cargados: 44, rechazados: 10 });
    expect(primera.conciliacion.ok).toBe(true);
    const rechazados = leerCsv(leer('rechazados.csv'));
    expect(rechazados[0]).toEqual(['fila', 'id_excel', 'curp', 'nss', 'motivos']);
    expect(rechazados.slice(1).map((f) => Number(f[1]))).toEqual(IDS_RECHAZADOS);

    // Segunda corrida: idempotencia.
    const segunda = reporte('segunda-corrida/reporte.json');
    expect(segunda.totales).toMatchObject({
      leidos: 54,
      cargados: 0,
      rechazados: 54,
      yaExistian: 46,
    });

    // Simulacro: mismos totales que la primera.
    const simulacro = reporte('simulacro/reporte.json');
    expect(simulacro.cabecera.simulacro).toBe(true);
    expect(simulacro.totales).toMatchObject({ leidos: 54, cargados: 44, rechazados: 10 });

    // Captura de Swagger: POST /etl/importaciones en 200 (PNG de más de 10 KB).
    const captura = readFileSync(join(EVIDENCIA, 'swagger-importaciones-200.png'));
    expect(
      captura.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe(true);
    expect(captura.length).toBeGreaterThan(10_000);

    // Salida de consola de las tres corridas.
    expect(leer('consola.txt').match(/Importación terminada/g)).toHaveLength(3);

    // Comparación de defectos: los 36 reflejados.
    const md = leer('defectos-vs-resultado.md');
    const defectos = leerDefectos(readFileSync(join(FIXTURES, 'defectos-sembrados.csv'), 'utf8'));
    expect(md).toContain('Reflejados según su clase propuesta: 36 de 36');
    expect(md).not.toContain('| NO |');
    expect(md.match(/\| Sí \|$/gm)).toHaveLength(defectos.length);

    // Ningún archivo de la evidencia trae una CURP ni un NSS completos.
    const todo = [
      leer('reporte.json'),
      leer('rechazados.csv'),
      leer('segunda-corrida/reporte.json'),
      leer('segunda-corrida/rechazados.csv'),
      leer('simulacro/reporte.json'),
      leer('consola.txt'),
      md,
    ].join('\n');
    for (const curp of curpsPorId.values()) if (curp.length >= 8) expect(todo).not.toContain(curp);
  });

  // Regenera la evidencia: ETL_EVIDENCIA=1 npx jest src/etl/aceptacion. Usa ejecutarCli, el mismo código
  // que `pnpm etl:importar`. Orden: simulacro sobre la base limpia, corrida real e idempotencia.
  itEvidencia(
    'CP-347 genera_evidencia: escribe docs/etl-corrida-ficticia con las tres corridas',
    async () => {
      const correo = (
        await ctx.ds.query<{ correo_electronico: string }[]>(
          `SELECT correo_electronico FROM usuarios WHERE id = $1`,
          [supervisor.id],
        )
      )[0].correo_electronico;
      // Se reescribe solo lo que genera esta prueba: la captura de Swagger (PNG) se toma aparte y no se borra.
      for (const generado of [
        'simulacro',
        'segunda-corrida',
        'reporte.json',
        'rechazados.csv',
        'consola.txt',
        'defectos-vs-resultado.md',
      ]) {
        rmSync(join(EVIDENCIA, generado), { recursive: true, force: true });
      }
      mkdirSync(EVIDENCIA, { recursive: true });
      const consola: string[] = [
        'Evidencia de la importación con el Excel ficticio (datos ficticios).',
        'Se generó llamando a ejecutarCli, la misma función que usa el comando de línea, y NO con "pnpm etl:importar".',
        'Orden de las corridas: 1) simulacro sobre la base limpia (no guarda nada), 2) corrida real, 3) segunda corrida (idempotencia).',
        'Argumentos de cada corrida: --archivo <Excel del fixture> --ejecutor <correo del Supervisor> --equivalencias <JSON del fixture> --salida <carpeta>.',
        '',
      ];
      const correr = async (titulo: string, salida: string, extra: string[]) => {
        const lineas: string[] = [];
        const codigo = await ejecutarCli(
          [
            '--archivo',
            FIXTURE,
            '--ejecutor',
            correo,
            '--equivalencias',
            JSON_EQUIVALENCIAS,
            '--salida',
            salida,
            ...extra,
          ],
          { out: (x) => void lineas.push(x), err: (x) => void lineas.push(`ERROR: ${x}`) },
        );
        expect(codigo).toBe(0);
        consola.push(
          `> ejecutarCli --archivo FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx --ejecutor <supervisor> ${extra.join(' ')}`.trim(),
        );
        consola.push(`# ${titulo}`, ...lineas, '');
      };
      await correr('Simulacro sobre la base limpia: no guarda nada', join(EVIDENCIA, 'simulacro'), [
        '--simulacro',
      ]);
      expect(await contar('clientes')).toBe(0);
      await correr('Primera corrida real', EVIDENCIA, []);
      expect(await contar('clientes')).toBe(44);
      await correr('Segunda corrida: idempotencia', join(EVIDENCIA, 'segunda-corrida'), []);
      expect(await contar('clientes')).toBe(44);
      writeFileSync(join(EVIDENCIA, 'consola.txt'), `${consola.join('\n')}\n`, 'utf8');

      const reporte = JSON.parse(
        readFileSync(join(EVIDENCIA, 'reporte.json'), 'utf8'),
      ) as ReporteEtl;
      const defectos = leerDefectos(readFileSync(join(FIXTURES, 'defectos-sembrados.csv'), 'utf8'));
      writeFileSync(
        join(EVIDENCIA, 'defectos-vs-resultado.md'),
        armarMarkdown(defectos, reporte),
        'utf8',
      );
    },
  );
});
