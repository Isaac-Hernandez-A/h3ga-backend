import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AddressInfo } from 'node:net';
import { configureApp } from '../app.setup';
import { Rol } from '../common/auth/authenticated-user';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { Cliente } from './entities/cliente.entity';
import { ClienteAuxiliar } from './entities/cliente-auxiliar.entity';

// Prueba de la cadena JwtAuthGuard -> RolesGuard -> ClienteAccessGuard sobre GET /api/v1/clientes/:clienteId,
// por HTTP y con repositorios simulados. Los tres roles pueden consultar un cliente; el auxiliar solo los
// que tiene autorizados (registro activo en cliente_auxiliares). Todos los valores son ficticios.
const SECRETO_PRUEBA = 'secreto-ficticio-solo-para-pruebas';
const ASESOR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ASESOR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const AUXILIAR = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const AUXILIAR_INACTIVO = 'a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2';
const AUXILIAR_SIN_REGISTRO = 'a3a3a3a3-a3a3-4a3a-8a3a-a3a3a3a3a3a3';
const SUPERVISOR = '55555555-5555-4555-8555-555555555555';
const CLIENTE_DE_A = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const CLIENTE_DE_B = 'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2';
const INEXISTENTE = 'c9c9c9c9-c9c9-4c9c-8c9c-c9c9c9c9c9c9';

const coincide = (fila: object, filtro: object) =>
  Object.entries(filtro).every(([k, v]) => (fila as Record<string, unknown>)[k] === v);

describe('GET /api/v1/clientes/:clienteId (flujo de los tres guards)', () => {
  let app: INestApplication;
  let base: string;
  const jwt = new JwtService({ secret: SECRETO_PRUEBA });
  const ahora = () => Math.floor(Date.now() / 1000);

  const filasClientes = [
    { id: CLIENTE_DE_A, asesor_id: ASESOR_A, nombre: 'Cliente A' },
    { id: CLIENTE_DE_B, asesor_id: ASESOR_B, nombre: 'Cliente B' },
  ];
  const repoClientes = {
    exists: ({ where }: { where: object }) =>
      Promise.resolve(filasClientes.some((f) => coincide(f, where))),
    findOneBy: (where: object) =>
      Promise.resolve(filasClientes.find((f) => coincide(f, where)) ?? null),
  };
  const filasAuxiliares = [
    { cliente_id: CLIENTE_DE_A, auxiliar_id: AUXILIAR, activo: true },
    { cliente_id: CLIENTE_DE_A, auxiliar_id: AUXILIAR_INACTIVO, activo: false },
  ];
  const repoAuxiliares = {
    exists: ({ where }: { where: object }) =>
      Promise.resolve(filasAuxiliares.some((f) => coincide(f, where))),
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRETO_PRUEBA })],
      controllers: [ClientesController],
      providers: [
        ClientesService,
        { provide: getRepositoryToken(Cliente), useValue: repoClientes },
        { provide: getRepositoryToken(ClienteAuxiliar), useValue: repoAuxiliares },
      ],
    }).compile();
    app = modulo.createNestApplication();
    configureApp(app);
    await app.listen(0);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/v1`;
  });

  afterAll(async () => {
    await app.close();
  });

  const token = (rol: string, sub: string, extra: object = {}) =>
    jwt.sign({ sub, rol, exp: ahora() + 300, ...extra });
  const pedir = (clienteId: string, bearer?: string) =>
    fetch(
      `${base}/clientes/${clienteId}`,
      bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {},
    );
  const como = (rol: Rol, sub: string) => token(rol, sub);

  describe('401: no hay una identidad válida', () => {
    it('sin token', async () => {
      expect((await pedir(CLIENTE_DE_A)).status).toBe(401);
    });

    it('con firma inválida', async () => {
      const ajeno = new JwtService({ secret: 'otro-secreto-ficticio-solo-para-pruebas' }).sign({
        sub: ASESOR_A,
        rol: 'asesor',
        exp: ahora() + 300,
      });
      expect((await pedir(CLIENTE_DE_A, ajeno)).status).toBe(401);
    });

    it('vencido', async () => {
      const vencido = token('asesor', ASESOR_A, { exp: ahora() - 60 });
      expect((await pedir(CLIENTE_DE_A, vencido)).status).toBe(401);
    });

    it('con un rol fuera del contrato', async () => {
      expect((await pedir(CLIENTE_DE_A, token('administrador', ASESOR_A))).status).toBe(401);
    });
  });

  describe('200: acceso permitido', () => {
    it('el auxiliar a un cliente con autorización activa', async () => {
      const respuesta = await pedir(CLIENTE_DE_A, como('auxiliar', AUXILIAR));
      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toMatchObject({ id: CLIENTE_DE_A });
    });

    it('el asesor a su propio cliente', async () => {
      const respuesta = await pedir(CLIENTE_DE_A, como('asesor', ASESOR_A));
      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toMatchObject({ id: CLIENTE_DE_A, nombre: 'Cliente A' });
    });

    it('el supervisor a cualquier cliente existente', async () => {
      expect((await pedir(CLIENTE_DE_A, como('supervisor', SUPERVISOR))).status).toBe(200);
      expect((await pedir(CLIENTE_DE_B, como('supervisor', SUPERVISOR))).status).toBe(200);
    });
  });

  describe('404: no se revela si el cliente existe', () => {
    it('el auxiliar sin ningún registro de autorización sobre el cliente', async () => {
      expect((await pedir(CLIENTE_DE_A, como('auxiliar', AUXILIAR_SIN_REGISTRO))).status).toBe(404);
    });

    it('el auxiliar con la autorización inactiva (activo = false)', async () => {
      expect((await pedir(CLIENTE_DE_A, como('auxiliar', AUXILIAR_INACTIVO))).status).toBe(404);
    });

    it('el auxiliar con un cliente que no le autorizaron', async () => {
      expect((await pedir(CLIENTE_DE_B, como('auxiliar', AUXILIAR))).status).toBe(404);
    });

    it('el asesor con un cliente de otro asesor', async () => {
      expect((await pedir(CLIENTE_DE_B, como('asesor', ASESOR_A))).status).toBe(404);
    });

    it('el supervisor con un cliente inexistente', async () => {
      expect((await pedir(INEXISTENTE, como('supervisor', SUPERVISOR))).status).toBe(404);
    });

    it('un id que no es uuid', async () => {
      expect((await pedir('no-es-uuid', como('supervisor', SUPERVISOR))).status).toBe(404);
    });

    it('cliente ajeno e inexistente reciben exactamente la misma respuesta', async () => {
      const ajeno = await (await pedir(CLIENTE_DE_B, como('asesor', ASESOR_A))).json();
      const inexistente = await (await pedir(INEXISTENTE, como('asesor', ASESOR_A))).json();
      expect(ajeno).toEqual(inexistente);
    });
  });
});
