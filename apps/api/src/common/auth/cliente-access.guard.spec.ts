import { ExecutionContext, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { ClienteAuxiliar } from '../../clientes/entities/cliente-auxiliar.entity';
import { AuthenticatedUser, REQUEST_USER_KEY, Rol } from './authenticated-user';
import { ClienteAccessGuard } from './cliente-access.guard';

// Ids ficticios.
const ASESOR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ASESOR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const AUXILIAR_1 = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const AUXILIAR_2 = 'a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2';
const AUXILIAR_3 = 'a3a3a3a3-a3a3-4a3a-8a3a-a3a3a3a3a3a3';
const SUPERVISOR = '55555555-5555-4555-8555-555555555555';
const CLIENTE_DE_A = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const CLIENTE_DE_B = 'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2';
const CLIENTE_INEXISTENTE = 'c9c9c9c9-c9c9-4c9c-8c9c-c9c9c9c9c9c9';

// Repositorio simulado: guarda filas en memoria y resuelve exists({ where }) por igualdad.
function repoSimulado<T extends object>(filas: Array<Partial<T>>): Repository<T> {
  const exists = jest.fn(({ where }: { where: Partial<T> }) =>
    Promise.resolve(
      filas.some((fila) =>
        Object.entries(where).every(
          ([clave, valor]) => (fila as Record<string, unknown>)[clave] === valor,
        ),
      ),
    ),
  );
  return { exists } as unknown as Repository<T>;
}

describe('ClienteAccessGuard', () => {
  const clientes = repoSimulado<Cliente>([
    { id: CLIENTE_DE_A, asesor_id: ASESOR_A },
    { id: CLIENTE_DE_B, asesor_id: ASESOR_B },
  ]);
  const auxiliares = repoSimulado<ClienteAuxiliar>([
    { cliente_id: CLIENTE_DE_A, auxiliar_id: AUXILIAR_1, activo: true },
    { cliente_id: CLIENTE_DE_A, auxiliar_id: AUXILIAR_2, activo: false },
  ]);
  const guard = new ClienteAccessGuard(clientes, auxiliares);

  const contexto = (
    usuario: AuthenticatedUser | undefined,
    peticion: { params?: Record<string, string>; body?: Record<string, unknown> },
  ) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ [REQUEST_USER_KEY]: usuario, ...peticion }) }),
    }) as ExecutionContext;
  const como = (rol: Rol, sub: string): AuthenticatedUser => ({ sub, rol });
  const enRuta = (clienteId: string) => ({ params: { clienteId } });

  describe('asesor', () => {
    it('accede a su propio cliente', async () => {
      await expect(
        guard.canActivate(contexto(como('asesor', ASESOR_A), enRuta(CLIENTE_DE_A))),
      ).resolves.toBe(true);
    });

    it('recibe 404 con un cliente de otro asesor', async () => {
      await expect(
        guard.canActivate(contexto(como('asesor', ASESOR_A), enRuta(CLIENTE_DE_B))),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('auxiliar', () => {
    it('accede a un cliente con autorización activa', async () => {
      await expect(
        guard.canActivate(contexto(como('auxiliar', AUXILIAR_1), enRuta(CLIENTE_DE_A))),
      ).resolves.toBe(true);
    });

    it('recibe 404 con un cliente que no le autorizaron', async () => {
      await expect(
        guard.canActivate(contexto(como('auxiliar', AUXILIAR_3), enRuta(CLIENTE_DE_A))),
      ).rejects.toThrow(NotFoundException);
    });

    it('recibe 404 si su autorización está inactiva', async () => {
      await expect(
        guard.canActivate(contexto(como('auxiliar', AUXILIAR_2), enRuta(CLIENTE_DE_A))),
      ).rejects.toThrow(NotFoundException);
    });

    it('recibe 404 con un cliente de otro asesor aunque tenga autorización en otro', async () => {
      await expect(
        guard.canActivate(contexto(como('auxiliar', AUXILIAR_1), enRuta(CLIENTE_DE_B))),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('supervisor', () => {
    it('accede a cualquier cliente existente', async () => {
      const supervisor = como('supervisor', SUPERVISOR);
      await expect(guard.canActivate(contexto(supervisor, enRuta(CLIENTE_DE_A)))).resolves.toBe(
        true,
      );
      await expect(guard.canActivate(contexto(supervisor, enRuta(CLIENTE_DE_B)))).resolves.toBe(
        true,
      );
    });

    it('recibe 404 si el cliente no existe', async () => {
      await expect(
        guard.canActivate(contexto(como('supervisor', SUPERVISOR), enRuta(CLIENTE_INEXISTENTE))),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('casos generales', () => {
    it('lee el cliente_id del cuerpo cuando la ruta no trae :clienteId', async () => {
      const peticion = { body: { cliente_id: CLIENTE_DE_A } };
      await expect(guard.canActivate(contexto(como('asesor', ASESOR_A), peticion))).resolves.toBe(
        true,
      );
      await expect(guard.canActivate(contexto(como('asesor', ASESOR_B), peticion))).rejects.toThrow(
        NotFoundException,
      );
    });

    it('recibe 404 si el cliente no existe, igual que si no tuviera acceso', async () => {
      await expect(
        guard.canActivate(contexto(como('asesor', ASESOR_A), enRuta(CLIENTE_INEXISTENTE))),
      ).rejects.toThrow('Cliente no encontrado.');
    });

    it('recibe 404 sin consultar la base si el id no es un uuid', async () => {
      const antes = (clientes.exists as jest.Mock).mock.calls.length;
      await expect(
        guard.canActivate(contexto(como('asesor', ASESOR_A), enRuta('no-es-uuid'))),
      ).rejects.toThrow(NotFoundException);
      expect((clientes.exists as jest.Mock).mock.calls.length).toBe(antes);
    });

    it('ignora una ruta sin id de cliente: no la restringe ni consulta la base', async () => {
      const consultasAntes = (clientes.exists as jest.Mock).mock.calls.length;
      await expect(guard.canActivate(contexto(como('asesor', ASESOR_A), {}))).resolves.toBe(true);
      expect((clientes.exists as jest.Mock).mock.calls.length).toBe(consultasAntes);
    });

    it('responde 401 si no hay usuario en la petición', async () => {
      await expect(guard.canActivate(contexto(undefined, enRuta(CLIENTE_DE_A)))).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
