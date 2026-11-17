import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { tomarBloqueoEtl } from '../common/testing/bloqueo-etl';
import {
  crearUsuarioPrueba,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { ejecutarCli } from './cli';
import { leerHojaClientes } from './lector-excel';
import { ReporteEtl } from './tipos';

// Comando de línea de la importación (Actividad 5, Tarea 12): integración con la base de pruebas (*_test).
// Arranca el contexto de NestJS sin HTTP, igual que `pnpm etl:importar`. Solo datos ficticios.
jest.setTimeout(300_000);

const RAIZ = resolve(__dirname, '../../../..');
const FIXTURE = resolve(RAIZ, 'test/fixtures/etl/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx');

describeConBd('ejecutarCli (comando etl:importar, base de pruebas)', () => {
  let ctx: AppConBd;
  // Candado que serializa las suites que cargan el mismo fixture (ver bloqueo-etl.ts).
  let liberarBloqueo: (() => Promise<void>) | undefined;
  let marco: UsuarioPrueba;
  let ana: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  let supervisorInactivo: UsuarioPrueba;
  let asesorEjecutor: UsuarioPrueba;
  let correoSupervisor: string;
  let correoSupervisorInactivo: string;
  let correoAsesor: string;
  let carpeta: string;
  let equivalencias: string;
  let curpsCrudas: string[];
  const fixture = readFileSync(FIXTURE);

  const correoDe = async (u: UsuarioPrueba) =>
    (
      await ctx.ds.query<{ correo_electronico: string }[]>(
        `SELECT correo_electronico FROM usuarios WHERE id = $1`,
        [u.id],
      )
    )[0].correo_electronico;

  // Ejecuta el comando capturando lo que imprime (por el canal que recibe y por la consola real).
  async function correr(argv: string[]) {
    const salida: string[] = [];
    const errores: string[] = [];
    const reales: string[] = [];
    const capturar = (...a: unknown[]) => void reales.push(a.map(String).join(' '));
    const espias = [
      jest.spyOn(console, 'log').mockImplementation(capturar),
      jest.spyOn(console, 'info').mockImplementation(capturar),
      jest.spyOn(console, 'warn').mockImplementation(capturar),
      jest.spyOn(console, 'error').mockImplementation(capturar),
      jest.spyOn(process.stdout, 'write').mockImplementation((c: unknown) => {
        reales.push(String(c));
        return true;
      }),
      jest.spyOn(process.stderr, 'write').mockImplementation((c: unknown) => {
        reales.push(String(c));
        return true;
      }),
    ];
    try {
      const codigo = await ejecutarCli(argv, {
        out: (t) => void salida.push(t),
        err: (t) => void errores.push(t),
      });
      return {
        codigo,
        salida: salida.join('\n'),
        errores: errores.join('\n'),
        todo: [...salida, ...errores, ...reales].join('\n'),
      };
    } finally {
      espias.forEach((e) => e.mockRestore());
    }
  }

  const argumentos = (extra: string[] = [], base: Record<string, string> = {}) => {
    const valores: Record<string, string> = {
      '--archivo': FIXTURE,
      '--ejecutor': correoSupervisor,
      '--equivalencias': equivalencias,
      '--salida': join(carpeta, 'salida'),
      '--lote': '10',
      ...base,
    };
    return [...Object.entries(valores).flat(), ...extra];
  };
  const leerReporte = (dir: string) =>
    JSON.parse(readFileSync(join(dir, 'reporte.json'), 'utf8')) as ReporteEtl;
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

  beforeAll(async () => {
    // Fija DATABASE_URL y JWT_SECRET (como iniciarAppConBd) para que el comando use la base de pruebas.
    ctx = await iniciarAppConBd();
    liberarBloqueo = await tomarBloqueoEtl(ctx.ds);
    marco = await crearUsuarioPrueba(ctx.ds, 'asesor');
    ana = await crearUsuarioPrueba(ctx.ds, 'asesor');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    supervisorInactivo = await crearUsuarioPrueba(ctx.ds, 'supervisor', { activo: false });
    asesorEjecutor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    correoSupervisor = await correoDe(supervisor);
    correoSupervisorInactivo = await correoDe(supervisorInactivo);
    correoAsesor = await correoDe(asesorEjecutor);
    carpeta = mkdtempSync(join(tmpdir(), 'etl-cli-'));
    equivalencias = join(carpeta, 'equivalencias.json');
    writeFileSync(
      equivalencias,
      JSON.stringify({
        'Lic. Marco Hernández': await correoDe(marco),
        'Lic. Ana Hernández': await correoDe(ana),
      }),
    );
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
    delete process.env.ETL_EQUIVALENCIAS;
    delete process.env.ETL_SALIDA;
    rmSync(join(carpeta, 'salida'), { recursive: true, force: true });
    await borrarClientes();
  });

  afterAll(async () => {
    if (carpeta) rmSync(carpeta, { recursive: true, force: true });
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await liberarBloqueo?.();
    await ctx.app.close();
  });

  it('CP-292 importa_con_ejecutor_supervisor: código 0, 44 clientes cargados y reporte en la carpeta de salida', async () => {
    const r = await correr(argumentos());
    expect([r.codigo, r.errores]).toEqual([0, '']);
    expect(await cargadosEnBase()).toBe(44);

    const salida = join(carpeta, 'salida');
    expect(readdirSync(salida).sort()).toEqual(['rechazados.csv', 'reporte.json']);
    const reporte = leerReporte(salida);
    expect(reporte.totales).toMatchObject({ leidos: 54, cargados: 44, rechazados: 10, lotes: 5 });
    expect(reporte.conciliacion.ok).toBe(true);
    expect(reporte.cabecera).toMatchObject({
      archivo: 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
      modo: 'comando',
      ejecutor: supervisor.id,
      simulacro: false,
    });
    // Resumen en pantalla: totales y dónde quedó el reporte.
    expect(r.salida).toMatch(/54/);
    expect(r.salida).toMatch(/44/);
    expect(r.salida).toContain(salida);
  });

  it('CP-292 el correo del ejecutor se busca sin distinguir mayúsculas', async () => {
    const r = await correr(
      argumentos(['--simulacro'], { '--ejecutor': correoSupervisor.toUpperCase() }),
    );
    expect(r.codigo).toBe(0);
  });

  it('CP-293 ejecutor_inexistente_o_no_supervisor: código 1 y nada se carga ni se escribe', async () => {
    const casos: [string, string][] = [
      ['no existe', 'nadie-no-existe@ejemplo.test'],
      ['es asesor', correoAsesor],
      ['supervisor inactivo', correoSupervisorInactivo],
    ];
    for (const [descripcion, correo] of casos) {
      const r = await correr(argumentos([], { '--ejecutor': correo }));
      expect([descripcion, r.codigo]).toEqual([descripcion, 1]);
      expect(r.errores).toMatch(/ejecutor/i);
    }
    expect(await cargadosEnBase()).toBe(0);
    expect(existsSync(join(carpeta, 'salida'))).toBe(false);
  });

  it('CP-294 simulacro: no guarda en la base pero sí escribe el reporte con los mismos totales', async () => {
    const r = await correr(argumentos(['--simulacro']));
    expect(r.codigo).toBe(0);
    expect(await cargadosEnBase()).toBe(0);
    const reporte = leerReporte(join(carpeta, 'salida'));
    expect(reporte.cabecera.simulacro).toBe(true);
    expect(reporte.totales).toMatchObject({ leidos: 54, cargados: 44, rechazados: 10 });
    expect(r.salida).toMatch(/simulacro/i);
  });

  it('CP-295 faltan_argumentos: código 1 con mensaje de uso, diciendo qué falta', async () => {
    const sinNada = await correr([]);
    expect(sinNada.codigo).toBe(1);
    expect(sinNada.errores).toMatch(/uso/i);
    expect(sinNada.errores).toContain('etl:importar');
    expect(sinNada.errores).toContain('--archivo');
    expect(sinNada.errores).toContain('--ejecutor');

    const sinEjecutor = await correr(['--archivo', FIXTURE]);
    expect(sinEjecutor.codigo).toBe(1);
    expect(sinEjecutor.errores).toContain('--ejecutor');

    const sinArchivo = await correr(['--ejecutor', correoSupervisor]);
    expect(sinArchivo.codigo).toBe(1);
    expect(sinArchivo.errores).toContain('--archivo');
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-295 opciones inválidas: lote que no es entero positivo, opción desconocida o archivo ilegible dan código 1', async () => {
    for (const lote of ['abc', '0', '-5', '2.5']) {
      const r = await correr(argumentos([], { '--lote': lote }));
      expect([lote, r.codigo]).toEqual([lote, 1]);
      expect(r.errores).toContain('--lote');
    }
    const desconocida = await correr(argumentos(['--borrar-todo']));
    expect(desconocida.codigo).toBe(1);

    const noExiste = await correr(argumentos([], { '--archivo': join(carpeta, 'no-existe.xlsx') }));
    expect(noExiste.codigo).toBe(1);
    expect(noExiste.errores).toMatch(/archivo/i);

    const texto = join(carpeta, 'texto.xlsx');
    writeFileSync(texto, 'esto no es un excel');
    const noEsExcel = await correr(argumentos([], { '--archivo': texto }));
    expect(noEsExcel.codigo).toBe(1);
    expect(noEsExcel.errores).toMatch(/xlsx|Excel/);
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-295 sin --equivalencias ni ETL_EQUIVALENCIAS: código 1 diciendo qué configurar', async () => {
    const valores = argumentos();
    const i = valores.indexOf('--equivalencias');
    valores.splice(i, 2);
    const r = await correr(valores);
    expect(r.codigo).toBe(1);
    expect(r.errores).toMatch(/equivalencias/i);
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-296 salida_sin_pii: nada de lo que imprime el comando contiene una CURP ni un NSS completos', async () => {
    const r = await correr(argumentos());
    expect(r.codigo).toBe(0);
    expect(r.todo.length).toBeGreaterThan(0);
    const { renglones } = await leerHojaClientes(fixture);
    let revisados = 0;
    for (const crudo of renglones) {
      const curp = String(crudo.celdas['CURP'] ?? '')
        .replace(/[\s-]/g, '')
        .toUpperCase();
      const nssCrudo = String(crudo.celdas['NSS'] ?? '').trim();
      const nss = nssCrudo.replace(/\D/g, '');
      if (curp.length >= 8) {
        expect(r.todo).not.toContain(curp);
        revisados++;
      }
      if (nss.length >= 6) {
        expect(r.todo).not.toContain(nss);
        revisados++;
      }
    }
    expect(revisados).toBeGreaterThan(80);
  });

  it('CP-328 sin --salida usa ETL_SALIDA con una subcarpeta propia de la corrida', async () => {
    const base = join(carpeta, 'etl-salida-env');
    process.env.ETL_SALIDA = base;
    const valores = argumentos(['--simulacro']);
    valores.splice(valores.indexOf('--salida'), 2);
    const r = await correr(valores);
    expect(r.codigo).toBe(0);
    const corridas = readdirSync(base);
    expect(corridas).toHaveLength(1);
    expect(corridas[0]).toMatch(/^\d{8}-\d{6}-[0-9a-f]{8}-[0-9a-f]{4}$/);
    expect(readdirSync(join(base, corridas[0])).sort()).toEqual(['rechazados.csv', 'reporte.json']);
  });

  it('CP-329 sin --equivalencias usa ETL_EQUIVALENCIAS, y sin --lote el lote es de 25', async () => {
    process.env.ETL_EQUIVALENCIAS = equivalencias;
    const valores = argumentos(['--simulacro']);
    valores.splice(valores.indexOf('--equivalencias'), 2);
    valores.splice(valores.indexOf('--lote'), 2);
    const r = await correr(valores);
    expect([r.codigo, r.errores]).toEqual([0, '']);
    expect(leerReporte(join(carpeta, 'salida')).totales.lotes).toBe(2); // 44 válidos en lotes de 25
  });

  it('CP-331 un "--" inicial (pnpm etl:importar -- --archivo ...) se ignora', async () => {
    const r = await correr(['--', ...argumentos(['--simulacro'])]);
    expect([r.codigo, r.errores]).toEqual([0, '']);
    expect(await cargadosEnBase()).toBe(0);
  });

  it('CP-330 el comando npm está declarado: script etl:importar y punto de entrada', () => {
    const paquete = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(paquete.scripts['etl:importar']).toMatch(/etl\/cli-main/);
    expect(paquete.scripts['etl:importar']).toContain('--env-file-if-exists=.env');
    const entrada = readFileSync(join(__dirname, 'cli-main.ts'), 'utf8');
    expect(entrada).toContain('ejecutarCli');
    expect(entrada).toContain('process.exit');
  });
});
