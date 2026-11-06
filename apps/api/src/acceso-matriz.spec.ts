import { Global, INestApplication, Module, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule, DiscoveryService, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { writeFileSync } from 'node:fs';
import { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { configureApp } from './app.setup';
import { MODULOS_DE_DOMINIO, PROVEEDORES_GLOBALES } from './app.module';
import { Rol } from './common/auth/authenticated-user';
import { ControlAccesoModule } from './common/auth/control-acceso.module';
import { IS_PUBLICO_KEY } from './common/auth/publico.decorator';
import { ROLES_KEY } from './common/auth/roles.decorator';
import {
  SECRETO_PRUEBA,
  tokenConFirmaInvalida,
  tokenDe,
  tokenVencido,
} from './common/testing/tokens';
import { repositorioVacio } from './common/testing/repositorio-vacio';
import { Cliente } from './clientes/entities/cliente.entity';
import { ClienteAuxiliar } from './clientes/entities/cliente-auxiliar.entity';
import { HealthController } from './health/health.controller';

// Matriz de acceso sobre las rutas REALES del router (se descubren con DiscoveryService y los metadatos
// de @Roles / @Publico; no hay una lista escrita a mano). Se monta la misma aplicación que AppModule
// (mismos módulos y proveedores globales) con una base de datos simulada. Valores ficticios.
jest.setTimeout(120_000);

const TODOS: Rol[] = ['asesor', 'auxiliar', 'supervisor'];
const ASESOR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ASESOR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const AUXILIAR_OK = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const AUXILIAR_INACTIVO = 'a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2';
const AUXILIAR_SIN_REGISTRO = 'a3a3a3a3-a3a3-4a3a-8a3a-a3a3a3a3a3a3';
const SUPERVISOR = '55555555-5555-4555-8555-555555555555';
const CLIENTE_DE_A = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const CLIENTE_DE_B = 'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2';
const INEXISTENTE = 'c9c9c9c9-c9c9-4c9c-8c9c-c9c9c9c9c9c9';
const OTRO_ID = '00000000-0000-4000-8000-000000000001';

const coincide = (fila: object, filtro: object) =>
  Object.entries(filtro).every(([k, v]) => (fila as Record<string, unknown>)[k] === v);

const filasClientes = [
  { id: CLIENTE_DE_A, asesor_id: ASESOR_A, nombre: 'Cliente A' },
  { id: CLIENTE_DE_B, asesor_id: ASESOR_B, nombre: 'Cliente B' },
];
const filasAuxiliares = [
  { cliente_id: CLIENTE_DE_A, auxiliar_id: AUXILIAR_OK, activo: true },
  { cliente_id: CLIENTE_DE_A, auxiliar_id: AUXILIAR_INACTIVO, activo: false },
];
const repoClientes = {
  exists: ({ where }: { where: object }) =>
    Promise.resolve(filasClientes.some((f) => coincide(f, where))),
  findOneBy: (where: object) =>
    Promise.resolve(filasClientes.find((f) => coincide(f, where)) ?? null),
};
const repoAuxiliares = {
  exists: ({ where }: { where: object }) =>
    Promise.resolve(filasAuxiliares.some((f) => coincide(f, where))),
};

// Base de datos simulada: solo los repositorios que usan los guards y el servicio de ejemplo.
const dataSourceFalso = {
  entityMetadatas: [],
  options: { type: 'postgres' },
  getRepository: (entidad: unknown) =>
    entidad === Cliente
      ? repoClientes
      : entidad === ClienteAuxiliar
        ? repoAuxiliares
        : repositorioVacio(),
};

@Global()
@Module({ providers: [{ provide: DataSource, useValue: dataSourceFalso }], exports: [DataSource] })
class BaseDeDatosFalsaModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [() => ({ JWT_SECRET: SECRETO_PRUEBA })],
    }),
    BaseDeDatosFalsaModule,
    DiscoveryModule,
    ControlAccesoModule,
    ...MODULOS_DE_DOMINIO,
  ],
  controllers: [HealthController],
  providers: PROVEEDORES_GLOBALES,
})
class AplicacionDePrueba {}

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

describe('Matriz de acceso (rutas reales del router)', () => {
  let app: INestApplication;
  let base: string;
  let rutas: Ruta[] = [];
  const resultados: Resultado[] = [];

  const usuarioConAcceso: Record<Rol, string> = {
    asesor: ASESOR_A,
    auxiliar: AUXILIAR_OK,
    supervisor: SUPERVISOR,
  };

  function descubrirRutas(): Ruta[] {
    const reflector = new Reflector();
    const encontradas: Ruta[] = [];
    for (const { instance } of app.get(DiscoveryService).getControllers()) {
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
    const modulo = await Test.createTestingModule({ imports: [AplicacionDePrueba] }).compile();
    app = modulo.createNestApplication();
    configureApp(app);
    await app.listen(0);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    rutas = descubrirRutas();

    // Cada ruta con cada rol, con un cliente al que ese rol sí tiene acceso.
    for (const ruta of rutas) {
      for (const rol of TODOS) {
        const respuesta = await pedir(ruta, tokenDe(rol, usuarioConAcceso[rol]));
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
    await app.close();
  });

  it('CP-01 sin token responde 401 en todas las rutas salvo /health', async () => {
    expect(rutas).toHaveLength(82);
    const fallos: string[] = [];
    for (const ruta of rutas) {
      const { estado } = await pedir(ruta);
      const esperado = ruta.publica ? 200 : 401;
      if (estado !== esperado)
        fallos.push(`${ruta.metodo} ${ruta.ruta}: ${estado} (esperado ${esperado})`);
    }
    expect(rutas.filter((r) => r.publica).map((r) => r.ruta)).toEqual(['/api/v1/health']);
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
