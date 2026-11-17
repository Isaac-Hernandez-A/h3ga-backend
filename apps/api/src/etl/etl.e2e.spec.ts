import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as ExcelJS from 'exceljs';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe, tokenVencido } from '../common/testing/tokens';
import { COLUMNAS_OBLIGATORIAS, leerHojaClientes } from './lector-excel';
import { ReporteEtl } from './tipos';

// POST /etl/importaciones con la aplicación REAL (guards, pipes, filtro de errores) y la base de pruebas.
// Solo datos ficticios; los clientes del fixture se borran al terminar cada prueba.
jest.setTimeout(120_000);

const RUTA = '/etl/importaciones';
const FIXTURE = resolve(
  __dirname,
  '../../../../test/fixtures/etl/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
);
const DOCS = resolve(__dirname, '../../../../docs');
const MB = 1024 * 1024;
// Valor que las pruebas de archivos inválidos meten en los renglones: ningún mensaje debe citarlo.
const VALOR_DE_RENGLON = 'VALOR-DE-RENGLON-NO-CITAR';

interface Error400 {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
}

describeConBd('POST /etl/importaciones (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let marco: UsuarioPrueba;
  let ana: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  let asesorSinEquivalencia: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let carpeta: string;
  let salida: string;
  let curpsCrudas: string[];
  const fixture = readFileSync(FIXTURE);
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

  async function subir(
    opciones: {
      token?: string;
      archivo?: Buffer | null;
      nombre?: string;
      consulta?: string;
    } = {},
  ) {
    const form = new FormData();
    if (opciones.archivo !== null) {
      form.append(
        'archivo',
        new Blob([new Uint8Array(opciones.archivo ?? fixture)]),
        opciones.nombre ?? 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
      );
    }
    const respuesta = await fetch(`${ctx.base}${RUTA}${opciones.consulta ?? ''}`, {
      method: 'POST',
      headers: opciones.token === undefined ? {} : { Authorization: `Bearer ${opciones.token}` },
      body: form,
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, json: (texto ? JSON.parse(texto) : {}) as unknown };
  }
  const reporte = (json: unknown) => json as ReporteEtl;
  const error = (json: unknown) => json as Error400;
  const mensaje = (json: unknown) => [error(json).message].flat().join(' ');

  const cargadosEnBase = async () =>
    Number(
      (
        await ctx.ds.query<{ n: string }[]>(
          `SELECT count(*) AS n FROM clientes WHERE asesor_id = ANY($1)`,
          [[marco.id, ana.id]],
        )
      )[0].n,
    );
  async function borrarClientes() {
    const donde = `SELECT id FROM clientes WHERE asesor_id = ANY($1) OR curp = ANY($2)`;
    const parametros = [[marco.id, ana.id], curpsCrudas];
    await ctx.ds.query(`DELETE FROM etapas_tramite WHERE cliente_id IN (${donde})`, parametros);
    await ctx.ds.query(
      `DELETE FROM clientes WHERE asesor_id = ANY($1) OR curp = ANY($2)`,
      parametros,
    );
  }

  // Libro con la forma del formato, armado en memoria, para las pruebas de archivos inválidos.
  async function libro(
    opciones: { hoja?: string; sinColumnas?: string[]; conDatos?: boolean } = {},
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const hoja = wb.addWorksheet(opciones.hoja ?? 'Clientes');
    const encabezados = COLUMNAS_OBLIGATORIAS.filter((c) => !opciones.sinColumnas?.includes(c));
    encabezados.forEach((e, i) => (hoja.getRow(5).getCell(i + 1).value = e));
    if (opciones.conDatos) {
      encabezados.forEach(
        (e, i) => (hoja.getRow(6).getCell(i + 1).value = e === 'ID' ? 1 : VALOR_DE_RENGLON),
      );
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    marco = await crearUsuarioPrueba(ctx.ds, 'asesor');
    ana = await crearUsuarioPrueba(ctx.ds, 'asesor');
    asesorSinEquivalencia = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    const correo = async (u: UsuarioPrueba) =>
      (
        await ctx.ds.query<{ correo_electronico: string }[]>(
          `SELECT correo_electronico FROM usuarios WHERE id = $1`,
          [u.id],
        )
      )[0].correo_electronico;

    // Equivalencias y carpeta de salida de la corrida, fuera del repositorio.
    carpeta = mkdtempSync(join(tmpdir(), 'etl-e2e-'));
    salida = join(carpeta, 'salida');
    writeFileSync(
      join(carpeta, 'equivalencias.json'),
      JSON.stringify({
        'Lic. Marco Hernández': await correo(marco),
        'Lic. Ana Hernández': await correo(ana),
      }),
    );
    process.env.ETL_EQUIVALENCIAS = join(carpeta, 'equivalencias.json');
    process.env.ETL_SALIDA = salida;

    curpsCrudas = (await leerHojaClientes(fixture)).renglones
      .map((r) =>
        String(r.celdas['CURP'] ?? '')
          .replace(/[\s-]/g, '')
          .toUpperCase(),
      )
      .filter((c) => c.length > 0);
    await borrarClientes();
  });

  afterEach(async () => {
    await borrarClientes();
  });

  afterAll(async () => {
    delete process.env.ETL_EQUIVALENCIAS;
    delete process.env.ETL_SALIDA;
    if (carpeta) rmSync(carpeta, { recursive: true, force: true });
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-283 supervisor_importa_200: responde 200 con el reporte y carga los 44 clientes', async () => {
    const { estado, json } = await subir({ token: t(supervisor) });
    expect(estado).toBe(200);
    const r = reporte(json);
    expect(r.totales).toMatchObject({ leidos: 54, cargados: 44, rechazados: 10 });
    expect(r.conciliacion.ok).toBe(true);
    expect(r.cabecera).toMatchObject({
      archivo: 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
      modo: 'api',
      ejecutor: supervisor.id,
      simulacro: false,
    });
    expect(r.cabecera.huellaSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await cargadosEnBase()).toBe(44);
    // El reporte nunca trae una CURP completa.
    expect(JSON.stringify(json)).not.toContain('MIBL760320HDFBBV55');
  });

  it('CP-284 simulacro_true_no_guarda: mismos totales y la base queda igual', async () => {
    const simulado = await subir({ token: t(supervisor), consulta: '?simulacro=true' });
    expect(simulado.estado).toBe(200);
    expect(reporte(simulado.json).cabecera.simulacro).toBe(true);
    expect(reporte(simulado.json).totales).toMatchObject({
      leidos: 54,
      cargados: 44,
      rechazados: 10,
    });
    expect(await cargadosEnBase()).toBe(0);

    const real = await subir({ token: t(supervisor), consulta: '?simulacro=false' });
    expect(real.estado).toBe(200);
    expect(reporte(real.json).totales.cargados).toBe(44);
    expect(await cargadosEnBase()).toBe(44);
  });

  it('CP-284 un valor de simulacro que no es exactamente true ni false responde 400 y no carga nada', async () => {
    // Un simulacro mal escrito nunca debe convertirse en una carga real.
    for (const valor of ['quizas', '1', '0', 'True', 'FALSE', 'si', 'no', '']) {
      const { estado } = await subir({ token: t(supervisor), consulta: `?simulacro=${valor}` });
      expect([valor, estado]).toEqual([valor, 400]);
    }
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-285 asesor_403_auxiliar_403: solo el Supervisor puede importar', async () => {
    for (const usuario of [marco, auxiliar, asesorSinEquivalencia]) {
      const { estado } = await subir({ token: t(usuario) });
      expect(estado).toBe(403);
    }
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-286 sin_token_401: sin token, con token vencido o con firma inválida responde 401', async () => {
    expect((await subir()).estado).toBe(401);
    expect((await subir({ token: tokenVencido('supervisor', supervisor.id) })).estado).toBe(401);
    expect((await subir({ token: 'no-es-un-token' })).estado).toBe(401);
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-287 sin_archivo_400: sin el campo archivo responde 400 con un mensaje claro', async () => {
    const { estado, json } = await subir({ token: t(supervisor), archivo: null });
    expect(estado).toBe(400);
    expect(mensaje(json)).toMatch(/archivo/i);
    expect(error(json).path).toContain(RUTA);
  });

  it('CP-288 no_es_xlsx_400: un .xls renombrado, un archivo dañado o uno vacío dan 400, nunca 500', async () => {
    const xls = Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.alloc(2048),
    ]);
    const danado = Buffer.concat([
      Buffer.from('PK\x03\x04'),
      Buffer.from('esto no es un zip valido'),
    ]);
    const casos: [string, Buffer, string][] = [
      ['xls renombrado a .xlsx', xls, 'datos.xlsx'],
      ['zip dañado', danado, 'datos.xlsx'],
      ['texto con extensión .xlsx', Buffer.from('hola, esto es texto'), 'datos.xlsx'],
      ['archivo vacío', Buffer.alloc(0), 'datos.xlsx'],
      ['extensión .xls', fixture, 'datos.xls'],
      ['extensión .csv', Buffer.from('a,b,c'), 'datos.csv'],
      ['pdf', Buffer.from('%PDF-1.4 ficticio'), 'datos.pdf'],
    ];
    for (const [descripcion, archivo, nombre] of casos) {
      const { estado, json } = await subir({ token: t(supervisor), archivo, nombre });
      expect([descripcion, estado]).toEqual([descripcion, 400]);
      expect(mensaje(json).length).toBeGreaterThan(0);
    }
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-289 mas_de_10_mb_400: un archivo de más de 10 MB responde 400 con el mismo contrato que los documentos', async () => {
    const grande = Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(10 * MB)]);
    const { estado, json } = await subir({ token: t(supervisor), archivo: grande });
    expect(estado).toBe(400);
    expect(mensaje(json)).toMatch(/10 MB/);
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-290 hoja_o_columnas_faltantes_400_con_detalle: el mensaje dice qué falta', async () => {
    const sinHoja = await subir({ token: t(supervisor), archivo: await libro({ hoja: 'Otra' }) });
    expect(sinHoja.estado).toBe(400);
    expect(mensaje(sinHoja.json)).toMatch(/hoja Clientes/);

    const sinColumnas = await subir({
      token: t(supervisor),
      archivo: await libro({ sinColumnas: ['CURP', 'Nombre del cliente'], conDatos: true }),
    });
    expect(sinColumnas.estado).toBe(400);
    expect(mensaje(sinColumnas.json)).toContain('CURP');
    expect(mensaje(sinColumnas.json)).toContain('Nombre del cliente');
    expect(mensaje(sinColumnas.json)).toMatch(/2 columnas/);

    const sinDatos = await subir({ token: t(supervisor), archivo: await libro() });
    expect(sinDatos.estado).toBe(400);
    expect(mensaje(sinDatos.json)).toMatch(/sin renglones de datos/);
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-291 matriz_de_acceso_incluye_la_ruta: la ruta ya no responde 501 y la documentación lo dice', async () => {
    // Supervisor sin archivo: supera los guards y falla la validación (400), ya no el esbozo 501.
    const { estado } = await subir({ token: t(supervisor), archivo: null });
    expect(estado).toBe(400);

    const csv = readFileSync(join(DOCS, 'pruebas-matriz-acceso.csv'), 'utf8').split(/\r?\n/);
    const filas = csv.filter((l) => l.startsWith('/api/v1/etl/importaciones,POST,'));
    expect(filas).toEqual([
      '/api/v1/etl/importaciones,POST,asesor,403,403',
      '/api/v1/etl/importaciones,POST,auxiliar,403,403',
      '/api/v1/etl/importaciones,POST,supervisor,supera los guards,400',
    ]);

    const endpoints = readFileSync(join(DOCS, 'endpoints.md'), 'utf8');
    expect(endpoints).toMatch(
      /\| POST {3}\| `\/api\/v1\/etl\/importaciones` .*\| supervisor \| Implementada \|/,
    );
    expect(endpoints).toMatch(/Total: 119 rutas\.\*\* Implementadas: 117\./);
    expect(endpoints).toMatch(/\| etl +\| 1 +\| 1 +\| 0 +\|/);
  });

  it('CP-322 reporte_en_disco: la corrida escribe reporte.json y rechazados.csv en la carpeta de salida', async () => {
    rmSync(salida, { recursive: true, force: true });
    const { estado, json } = await subir({ token: t(supervisor), consulta: '?simulacro=true' });
    expect(estado).toBe(200);
    const corridas = readdirSync(salida);
    expect(corridas).toHaveLength(1);
    const guardado = JSON.parse(readFileSync(join(salida, corridas[0], 'reporte.json'), 'utf8'));
    expect(guardado).toEqual(JSON.parse(JSON.stringify(json)));
    const csv = readFileSync(join(salida, corridas[0], 'rechazados.csv'), 'utf8')
      .trim()
      .split(/\r?\n/);
    expect(csv).toHaveLength(1 + 10);
  });

  it('CP-323 sin_equivalencias_configuradas_503: si falta la configuración responde un error claro y no carga nada', async () => {
    const guardada = process.env.ETL_EQUIVALENCIAS;
    delete process.env.ETL_EQUIVALENCIAS;
    try {
      const { estado, json } = await subir({ token: t(supervisor) });
      expect(estado).toBe(503);
      expect(mensaje(json)).toMatch(/ETL_EQUIVALENCIAS/);
    } finally {
      process.env.ETL_EQUIVALENCIAS = guardada;
    }
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-324 equivalencias_ilegibles_503: un JSON de equivalencias inválido responde 503 y no carga nada', async () => {
    const guardada = process.env.ETL_EQUIVALENCIAS;
    const malo = join(carpeta, 'malo.json');
    writeFileSync(malo, '{ esto no es json');
    process.env.ETL_EQUIVALENCIAS = malo;
    try {
      const { estado, json } = await subir({ token: t(supervisor) });
      expect(estado).toBe(503);
      expect(mensaje(json)).toMatch(/equivalencias/i);
    } finally {
      process.env.ETL_EQUIVALENCIAS = guardada;
    }
    expect(await cargadosEnBase()).toBe(0);
  });
  it('CP-325 respuesta_sin_pii: el cuerpo de la respuesta 200 no contiene ninguna CURP ni NSS completos', async () => {
    const { estado, json } = await subir({ token: t(supervisor) });
    expect(estado).toBe(200);
    const texto = JSON.stringify(json);
    const { renglones } = await leerHojaClientes(fixture);
    let revisados = 0;
    for (const r of renglones) {
      const curp = String(r.celdas['CURP'] ?? '')
        .replace(/[\s-]/g, '')
        .toUpperCase();
      const nssCrudo = String(r.celdas['NSS'] ?? '').trim();
      const nss = nssCrudo.replace(/\D/g, '');
      if (curp.length >= 8) {
        expect(texto).not.toContain(curp);
        revisados++;
      }
      if (nss.length >= 6) {
        expect(texto).not.toContain(nss);
        expect(texto).not.toContain(nssCrudo);
        revisados++;
      }
    }
    expect(revisados).toBeGreaterThan(80);
    // Sí trae los últimos 4 caracteres, enmascarados.
    expect(texto).toMatch(/•{14}[A-Z0-9]{4}/);
  });

  it('CP-326 subcarpeta_de_salida_propia: la genera el servidor y nada del nombre del archivo entra en la ruta', async () => {
    rmSync(salida, { recursive: true, force: true });
    const a = await subir({
      token: t(supervisor),
      consulta: '?simulacro=true',
      nombre: '../../x.xlsx',
    });
    const b = await subir({
      token: t(supervisor),
      consulta: '?simulacro=true',
      nombre: String.raw`..\..\x.xlsx`,
    });
    expect([a.estado, b.estado]).toEqual([200, 200]);
    // Solo el nombre base llega al reporte, sin rutas.
    expect(reporte(a.json).cabecera.archivo).toBe('x.xlsx');
    expect(reporte(b.json).cabecera.archivo).toBe('x.xlsx');

    // Dos subidas del mismo archivo en el mismo segundo no se pisan: fecha, huella e identificador propio.
    const corridas = readdirSync(salida);
    expect(corridas).toHaveLength(2);
    for (const nombre of corridas) {
      expect(nombre).toMatch(/^\d{8}-\d{6}-[0-9a-f]{8}-[0-9a-f]{4}$/);
      expect(readdirSync(join(salida, nombre)).sort()).toEqual(['rechazados.csv', 'reporte.json']);
    }
    expect(existsSync(join(carpeta, 'x.xlsx'))).toBe(false);
    expect(existsSync(join(tmpdir(), 'x.xlsx'))).toBe(false);
    expect(existsSync(join(salida, 'x.xlsx'))).toBe(false);
  });

  it('CP-327 mensajes_de_400_sin_valores: citan nombres de columnas, nunca valores de renglones ni del archivo', async () => {
    const contenido = 'CONTENIDO-SECRETO-DEL-ARCHIVO';
    const casos: [string, Buffer][] = [
      ['columna faltante', await libro({ sinColumnas: ['CURP'], conDatos: true })],
      ['hoja distinta', await libro({ hoja: 'Otra', conDatos: true })],
      ['texto con extensión .xlsx', Buffer.from(contenido)],
      ['zip dañado', Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.from(contenido)])],
    ];
    for (const [descripcion, archivo] of casos) {
      const { estado, json } = await subir({ token: t(supervisor), archivo });
      expect([descripcion, estado]).toEqual([descripcion, 400]);
      expect(mensaje(json)).not.toContain(VALOR_DE_RENGLON);
      expect(mensaje(json)).not.toContain(contenido);
    }
    // Sí puede citar el nombre de una columna.
    const faltante = await subir({
      token: t(supervisor),
      archivo: await libro({ sinColumnas: ['CURP'], conDatos: true }),
    });
    expect(mensaje(faltante.json)).toContain('CURP');
  });
});
