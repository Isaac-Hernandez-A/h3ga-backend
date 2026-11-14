import { INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, ModulesContainer, Reflector } from '@nestjs/core';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Rol } from './common/auth/authenticated-user';
import { IS_PUBLICO_KEY } from './common/auth/publico.decorator';
import { ROLES_KEY } from './common/auth/roles.decorator';
import { describeConBd, iniciarAppConBd } from './common/testing/bd-pruebas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  idsDeCatalogo,
  insertarCliente,
  limpiarDatosClientes,
} from './common/testing/datos-clientes';
import { tokenConFirmaInvalida, tokenDe, tokenVencido } from './common/testing/tokens';

// Matriz de acceso sobre las rutas REALES del router (se descubren con DiscoveryService y los metadatos
// de @Roles / @Publico; no hay una lista escrita a mano). Se levanta AppModule completo contra la base de
// pruebas h3ga_test con datos mínimos ficticios, de modo que los handlers reales responden (200, 400, 404 o
// 501) y ningún caso puede terminar en 500. Se omite si no hay TEST_DATABASE_URL.
jest.setTimeout(120_000);

const TODOS: Rol[] = ['asesor', 'auxiliar', 'supervisor'];
// Ids de usuarios y clientes: se crean en la base en beforeAll.
let ASESOR_A: string;
let ASESOR_B: string;
let AUXILIAR_OK: string;
let AUXILIAR_INACTIVO: string;
let AUXILIAR_SIN_REGISTRO: string;
let SUPERVISOR: string;
let CLIENTE_DE_A: string;
let CLIENTE_DE_B: string;
const INEXISTENTE = 'c9c9c9c9-c9c9-4c9c-8c9c-c9c9c9c9c9c9';
const OTRO_ID = '00000000-0000-4000-8000-000000000001';

interface Ruta {
  metodo: string;
  ruta: string;
  roles: Rol[] | undefined;
  publica: boolean;
  conCliente: boolean;
}

interface Respuesta {
  estado: number;
  mensaje?: string;
}

interface Resultado extends Respuesta {
  ruta: Ruta;
  rol: Rol;
  esperado: string;
}

describeConBd('Matriz de acceso (rutas reales del router, base de pruebas)', () => {
  let app: INestApplication;
  let limpiar: () => Promise<void>;
  let base: string;
  let rutas: Ruta[] = [];
  const resultados: Resultado[] = [];

  const usuarioConAcceso = (): Record<Rol, string> => ({
    asesor: ASESOR_A,
    auxiliar: AUXILIAR_OK,
    supervisor: SUPERVISOR,
  });

  function descubrirRutas(): Ruta[] {
    const reflector = new Reflector();
    const encontradas: Ruta[] = [];
    for (const { instance } of new DiscoveryService(app.get(ModulesContainer)).getControllers()) {
      if (!instance) continue;
      const clase = instance.constructor;
      const prototipo = Object.getPrototypeOf(instance) as Record<string, () => unknown>;
      const prefijo = reflector.get<string>(PATH_METADATA, clase) ?? '';
      for (const nombre of Object.getOwnPropertyNames(prototipo)) {
        if (nombre === 'constructor') continue;
        const handler = prototipo[nombre];
        const ruta = reflector.get<string>(PATH_METADATA, handler);
        const metodo = reflector.get<number>(METHOD_METADATA, handler);
        if (ruta === undefined || metodo === undefined) continue;
        const completa = `/api/v1/${prefijo}/${ruta}`.replace(/\/+/g, '/').replace(/\/$/, '');
        encontradas.push({
          metodo: RequestMethod[metodo],
          ruta: completa,
          roles: reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [handler, clase]),
          publica:
            reflector.getAllAndOverride<boolean | undefined>(IS_PUBLICO_KEY, [handler, clase]) ===
            true,
          conCliente: completa.includes(':clienteId'),
        });
      }
    }
    return encontradas.sort((a, b) =>
      `${a.ruta} ${a.metodo}`.localeCompare(`${b.ruta} ${b.metodo}`),
    );
  }

  // El 404 de ClienteAccessGuard se reconoce por su mensaje exacto: otros 404 (p. ej. un documento
  // inexistente) no cuentan como bloqueo del guard.
  const MENSAJE_GUARD = 'Cliente no encontrado.';
  const bloqueada = ({ estado, mensaje }: Respuesta) =>
    estado === 401 || estado === 403 || (estado === 404 && mensaje === MENSAJE_GUARD);
  const esNegadaPorCliente = ({ estado, mensaje }: Respuesta) =>
    estado === 404 && mensaje === MENSAJE_GUARD;

  async function pedir(ruta: Ruta, bearer?: string, clienteId = CLIENTE_DE_A): Promise<Respuesta> {
    const url = base + ruta.ruta.replace(':clienteId', clienteId).replace(/:\w+/g, OTRO_ID);
    const conCuerpo = ['POST', 'PUT', 'PATCH'].includes(ruta.metodo);
    const respuesta = await fetch(url, {
      method: ruta.metodo,
      headers: {
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(conCuerpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: conCuerpo ? '{}' : undefined,
    });
    const texto = await respuesta.text();
    let mensaje: string | undefined;
    try {
      const cuerpo = JSON.parse(texto) as { message?: unknown };
      mensaje = typeof cuerpo.message === 'string' ? cuerpo.message : undefined;
    } catch {
      mensaje = undefined;
    }
    return { estado: respuesta.status, mensaje };
  }

  async function cuerpoDeError(ruta: Ruta, bearer: string, clienteId: string) {
    const url = base + ruta.ruta.replace(':clienteId', clienteId);
    const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
    const { statusCode, error, message } = (await respuesta.json()) as Record<string, unknown>;
    return { statusCode, error, message };
  }

  const protegidas = () => rutas.filter((r) => !r.publica);
  const conCliente = (rol: Rol) =>
    protegidas().filter((r) => r.conCliente && r.roles?.includes(rol));
  const esperadoPara = (r: Ruta, rol: Rol) =>
    r.publica ? 'pública' : r.roles?.includes(rol) ? 'supera los guards' : '403';

  beforeAll(async () => {
    const ctx = await iniciarAppConBd();
    app = ctx.app;
    base = ctx.base.replace(/\/api\/v1$/, '');
    limpiar = () => limpiarDatosClientes(ctx.ds);
    const catalogo = await idsDeCatalogo(ctx.ds);
    ASESOR_A = (await crearUsuarioPrueba(ctx.ds, 'asesor')).id;
    ASESOR_B = (await crearUsuarioPrueba(ctx.ds, 'asesor')).id;
    AUXILIAR_OK = (await crearUsuarioPrueba(ctx.ds, 'auxiliar')).id;
    AUXILIAR_INACTIVO = (await crearUsuarioPrueba(ctx.ds, 'auxiliar')).id;
    AUXILIAR_SIN_REGISTRO = (await crearUsuarioPrueba(ctx.ds, 'auxiliar')).id;
    SUPERVISOR = (await crearUsuarioPrueba(ctx.ds, 'supervisor')).id;
    CLIENTE_DE_A = await insertarCliente(ctx.ds, catalogo, ASESOR_A);
    CLIENTE_DE_B = await insertarCliente(ctx.ds, catalogo, ASESOR_B);
    await autorizarEnBd(ctx.ds, CLIENTE_DE_A, AUXILIAR_OK, SUPERVISOR, true);
    await autorizarEnBd(ctx.ds, CLIENTE_DE_A, AUXILIAR_INACTIVO, SUPERVISOR, false);
    rutas = descubrirRutas();

    // Cada ruta con cada rol, con un cliente al que ese rol sí tiene acceso.
    for (const ruta of rutas) {
      for (const rol of TODOS) {
        const respuesta = await pedir(ruta, tokenDe(rol, usuarioConAcceso()[rol]));
        resultados.push({ ruta, rol, esperado: esperadoPara(ruta, rol), ...respuesta });
      }
    }
    const filas = resultados.map(
      ({ ruta, rol, esperado, estado }) =>
        `${ruta.ruta},${ruta.metodo},${rol},${esperado},${estado}`,
    );
    writeFileSync(
      resolve(__dirname, '../../../docs/pruebas-matriz-acceso.csv'),
      ['ruta,metodo,rol,codigo_esperado,codigo_obtenido', ...filas].join('\n') + '\n',
    );
  });

  afterAll(async () => {
    if (!app) return;
    await limpiar();
    await app.close();
  });

  it('CP-01 sin token responde 401 en todas las rutas salvo las públicas (/health y /auth/login)', async () => {
    expect(rutas).toHaveLength(119);
    const fallos: string[] = [];
    for (const ruta of rutas) {
      const { estado } = await pedir(ruta);
      // Las públicas no piden token: /health responde 200 y /auth/login, sin credenciales (cuerpo vacío), 400.
      const esperado = ruta.publica ? (ruta.ruta === '/api/v1/auth/login' ? 400 : 200) : 401;
      if (estado !== esperado)
        fallos.push(`${ruta.metodo} ${ruta.ruta}: ${estado} (esperado ${esperado})`);
    }
    expect(rutas.filter((r) => r.publica).map((r) => r.ruta)).toEqual([
      '/api/v1/auth/login',
      '/api/v1/health',
    ]);
    expect(fallos).toEqual([]);
  });

  it('CP-02 token vencido o con firma inválida responde 401', async () => {
    const fallos: string[] = [];
    for (const ruta of protegidas()) {
      for (const [tipo, token] of [
        ['vencido', tokenVencido('supervisor', SUPERVISOR)],
        ['firma inválida', tokenConFirmaInvalida('supervisor', SUPERVISOR)],
      ]) {
        const { estado } = await pedir(ruta, token);
        if (estado !== 401) fallos.push(`${ruta.metodo} ${ruta.ruta} (${tipo}): ${estado}`);
      }
    }
    expect(fallos).toEqual([]);
  });

  it('CP-03 rol no permitido responde 403 en cada ruta', () => {
    expect(protegidas().every((r) => (r.roles?.length ?? 0) > 0)).toBe(true);
    const fallos = resultados
      .filter(({ ruta, rol }) => !ruta.publica && !ruta.roles?.includes(rol))
      .filter(({ estado }) => estado !== 403)
      .map(({ ruta, rol, estado }) => `${ruta.metodo} ${ruta.ruta} como ${rol}: ${estado}`);
    expect(fallos).toEqual([]);
  });

  it('CP-04 rol permitido supera los guards en cada ruta', () => {
    const fallos = resultados
      .filter(({ ruta, rol }) => !ruta.publica && ruta.roles?.includes(rol))
      .filter((resultado) => bloqueada(resultado))
      .map(({ ruta, rol, estado }) => `${ruta.metodo} ${ruta.ruta} como ${rol}: ${estado}`);
    expect(fallos).toEqual([]);
  });

  it('CP-68 ninguna combinación ruta-rol responde 500 (el handler no falla)', () => {
    const fallos = resultados
      .filter(({ estado }) => estado === 500)
      .map(({ ruta, rol }) => `${ruta.metodo} ${ruta.ruta} como ${rol}`);
    expect(fallos).toEqual([]);
  });

  it('CP-79 la matriz cubre todas las rutas del router (3 roles cada una), ninguna combinación responde 500 y el CSV y endpoints.md coinciden con ella', () => {
    // Cada ruta real se probó con los 3 roles.
    expect(resultados).toHaveLength(rutas.length * 3);
    expect(resultados.filter(({ estado }) => estado === 500)).toEqual([]);

    // docs/pruebas-matriz-acceso.csv: una fila por ruta y rol, con lo que respondió la aplicación.
    const csv = readFileSync(resolve(__dirname, '../../../docs/pruebas-matriz-acceso.csv'), 'utf-8')
      .trim()
      .split(/\r?\n/);
    expect(csv[0]).toBe('ruta,metodo,rol,codigo_esperado,codigo_obtenido');
    expect(csv).toHaveLength(1 + rutas.length * 3);

    // docs/endpoints.md: el total sale de las rutas reales; las implementadas son el total menos las filas
    // marcadas 501. Una ruta que respondió 501 en la matriz debe estar marcada 501 en la tabla (un POST con
    // cuerpo vacío puede fallar la validación con 400 antes de llegar al handler, así que lo inverso no se
    // puede deducir de la matriz y se verifica solo por conteo).
    const endpoints = readFileSync(resolve(__dirname, '../../../docs/endpoints.md'), 'utf-8');
    const declarado = /Total: (\d+) rutas\.\*\* Implementadas: (\d+)\./.exec(endpoints);
    expect(declarado).not.toBeNull();
    const filas501 = endpoints
      .split(/\r?\n/)
      .filter((l) => /^\| [A-Z]+ +\| `\/api\/v1\S*` .*\| 501 +\|$/.test(l));
    expect([Number(declarado![1]), Number(declarado![2]) + filas501.length]).toEqual([
      rutas.length,
      rutas.length,
    ]);
    const marcadas501 = new Set(
      filas501.map((l) => /^\| ([A-Z]+) +\| `([^`]+)`/.exec(l)!.slice(1, 3).join(' ')),
    );
    const respondieron501 = [
      ...new Set(
        resultados
          .filter(({ estado }) => estado === 501)
          .map(({ ruta }) => `${ruta.metodo} ${ruta.ruta}`),
      ),
    ];
    expect(respondieron501.filter((r) => !marcadas501.has(r))).toEqual([]);
    // Cada ruta real aparece en la tabla de su módulo.
    const sinDocumentar = rutas
      .filter((r) => !endpoints.includes(`| ${r.metodo.padEnd(6)} | \`${r.ruta}\``))
      .map((r) => `${r.metodo} ${r.ruta}`);
    expect(sinDocumentar).toEqual([]);
  });

  it('CP-05 asesor B sobre un cliente de asesor A recibe 404 en toda ruta :clienteId', async () => {
    const rutasDelAsesor = conCliente('asesor');
    expect(rutasDelAsesor.length).toBeGreaterThan(0);
    const fallos: string[] = [];
    for (const ruta of rutasDelAsesor) {
      const respuesta = await pedir(ruta, tokenDe('asesor', ASESOR_B), CLIENTE_DE_A);
      if (!esNegadaPorCliente(respuesta)) {
        fallos.push(`${ruta.metodo} ${ruta.ruta}: ${respuesta.estado}`);
      }
    }
    expect(fallos).toEqual([]);
  });

  it('CP-06 auxiliar: autorización activa pasa; sin registro o con activo=false recibe 404', async () => {
    const rutasDelAuxiliar = conCliente('auxiliar');
    expect(rutasDelAuxiliar.length).toBeGreaterThan(0);
    const fallos: string[] = [];
    for (const ruta of rutasDelAuxiliar) {
      const activo = await pedir(ruta, tokenDe('auxiliar', AUXILIAR_OK));
      if (bloqueada(activo)) fallos.push(`activo ${ruta.metodo} ${ruta.ruta}: ${activo.estado}`);
      for (const [caso, sub] of [
        ['sin registro', AUXILIAR_SIN_REGISTRO],
        ['inactivo', AUXILIAR_INACTIVO],
      ]) {
        const respuesta = await pedir(ruta, tokenDe('auxiliar', sub));
        if (!esNegadaPorCliente(respuesta)) {
          fallos.push(`${caso} ${ruta.metodo} ${ruta.ruta}: ${respuesta.estado}`);
        }
      }
    }
    expect(fallos).toEqual([]);
  });

  it('CP-07 supervisor accede a cualquier cliente existente; inexistente da el mismo 404 que sin acceso', async () => {
    const rutasDelSupervisor = conCliente('supervisor');
    expect(rutasDelSupervisor.length).toBeGreaterThan(0);
    const fallos: string[] = [];
    for (const ruta of rutasDelSupervisor) {
      for (const cliente of [CLIENTE_DE_A, CLIENTE_DE_B]) {
        const existente = await pedir(ruta, tokenDe('supervisor', SUPERVISOR), cliente);
        if (bloqueada(existente)) {
          fallos.push(`existente ${ruta.metodo} ${ruta.ruta}: ${existente.estado}`);
        }
      }
      const inexistente = await pedir(ruta, tokenDe('supervisor', SUPERVISOR), INEXISTENTE);
      if (!esNegadaPorCliente(inexistente)) {
        fallos.push(`inexistente ${ruta.metodo} ${ruta.ruta}: ${inexistente.estado}`);
      }
    }
    expect(fallos).toEqual([]);

    const detalle = rutas.find(
      (r) => r.metodo === 'GET' && r.ruta === '/api/v1/clientes/:clienteId',
    );
    if (!detalle) throw new Error('No se encontró GET /clientes/:clienteId');
    const sinAcceso = await cuerpoDeError(detalle, tokenDe('asesor', ASESOR_A), CLIENTE_DE_B);
    const noExiste = await cuerpoDeError(detalle, tokenDe('supervisor', SUPERVISOR), INEXISTENTE);
    expect(noExiste).toEqual(sinAcceso);
  });
});
