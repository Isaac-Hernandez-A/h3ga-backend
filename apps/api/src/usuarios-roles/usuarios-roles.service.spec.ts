import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { ROL_ID } from '../common/auth/roles-sistema';
import { PasswordHasher } from '../common/seguridad/password-hasher';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { Rol } from './entities/rol.entity';
import { TipoAsesor } from './entities/tipo-asesor.entity';
import { Usuario } from './entities/usuario.entity';
import { UsuariosRolesService } from './usuarios-roles.service';

// Pruebas del servicio con repositorios simulados. Datos ficticios.
const CONTRASENA = 'contrasena-ficticia-123';
const TIPO_ASESOR_EXISTENTE = 5;

interface FilaUsuario {
  id: string;
  rol_id: number;
  tipo_asesor_id: number | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo_electronico: string;
  contrasena_hash: string;
  activo: boolean;
  fecha_creacion: Date;
}

// Repositorio de usuarios en memoria. Imita la restricción UNIQUE del correo con el mismo error de PostgreSQL.
function repositorioDeUsuarios() {
  const filas: FilaUsuario[] = [];
  let contador = 0;
  return {
    filas,
    create: (datos: Partial<FilaUsuario>) => ({ ...datos }),
    save: jest.fn((fila: Partial<FilaUsuario>) => {
      if (filas.some((f) => f.correo_electronico === fila.correo_electronico && f.id !== fila.id)) {
        const error = Object.assign(new Error('llave duplicada'), { code: '23505' });
        return Promise.reject(new QueryFailedError('INSERT', [], error));
      }
      const existente = filas.find((f) => f.id === fila.id);
      if (existente) return Promise.resolve(Object.assign(existente, fila));
      const nueva = {
        ...fila,
        id: `00000000-0000-4000-8000-${String(++contador).padStart(12, '0')}`,
      } as FilaUsuario;
      filas.push(nueva);
      return Promise.resolve(nueva);
    }),
    find: jest.fn(({ where }: { where?: { activo?: boolean } } = {}) =>
      Promise.resolve(
        filas.filter((f) => where?.activo === undefined || f.activo === where.activo),
      ),
    ),
    findOneBy: jest.fn(({ id }: { id: string }) =>
      Promise.resolve(filas.find((f) => f.id === id) ?? null),
    ),
  };
}

const rolesDeLaSemilla = [
  { id: 1, nombre: 'Asesor', descripcion: null },
  { id: 2, nombre: 'Auxiliar Administrativo', descripcion: null },
  { id: 3, nombre: 'Supervisor Operativo (Admin)', descripcion: null },
];

describe('UsuariosRolesService', () => {
  let servicio: UsuariosRolesService;
  let usuarios: ReturnType<typeof repositorioDeUsuarios>;
  const hasher: PasswordHasher = {
    hash: jest.fn((plain: string) => Promise.resolve(`hash(${plain})`)),
  };

  let correoSecuencia = 0;
  const dto = (extra: Partial<CrearUsuarioDto> = {}): CrearUsuarioDto => ({
    rol_id: ROL_ID.supervisor,
    nombre: 'Prueba',
    apellido_paterno: 'Ficticio',
    apellido_materno: 'Ficticio',
    correo_electronico: `prueba-${++correoSecuencia}@ejemplo.invalid`,
    contrasena: CONTRASENA,
    ...extra,
  });

  beforeEach(async () => {
    usuarios = repositorioDeUsuarios();
    const modulo = await Test.createTestingModule({
      providers: [
        UsuariosRolesService,
        { provide: PasswordHasher, useValue: hasher },
        { provide: getRepositoryToken(Usuario), useValue: usuarios },
        {
          provide: getRepositoryToken(Rol),
          useValue: {
            existsBy: ({ id }: { id: number }) => Promise.resolve([1, 2, 3].includes(id)),
            find: () => Promise.resolve(rolesDeLaSemilla),
          },
        },
        {
          provide: getRepositoryToken(TipoAsesor),
          useValue: {
            existsBy: ({ id }: { id: number }) => Promise.resolve(id === TIPO_ASESOR_EXISTENTE),
            find: () => Promise.resolve([]),
          },
        },
      ],
    }).compile();
    servicio = modulo.get(UsuariosRolesService);
    (hasher.hash as jest.Mock).mockClear();
  });

  describe('crear', () => {
    it('CP-08 cifra la contraseña, guarda solo el hash y no devuelve contraseña ni hash', async () => {
      const entrada = dto();
      const respuesta = await servicio.crear(entrada);

      expect(hasher.hash).toHaveBeenCalledWith(CONTRASENA);
      expect(usuarios.filas[0].contrasena_hash).toBe(`hash(${CONTRASENA})`);
      expect(respuesta).not.toHaveProperty('contrasena_hash');
      expect(respuesta).not.toHaveProperty('contrasena');
      expect(respuesta).toMatchObject({
        correo_electronico: entrada.correo_electronico,
        activo: true,
        tipo_asesor_id: null,
      });
      expect(respuesta.fecha_creacion).toBeInstanceOf(Date);
    });

    it('CP-09 un correo repetido responde 409', async () => {
      const entrada = dto();
      await servicio.crear(entrada);
      await expect(
        servicio.crear({ ...dto(), correo_electronico: entrada.correo_electronico }),
      ).rejects.toThrow(ConflictException);
    });

    it('un rol_id inexistente responde 400', async () => {
      await expect(servicio.crear(dto({ rol_id: 99 }))).rejects.toThrow(BadRequestException);
    });

    it('CP-12 un tipo_asesor_id inexistente responde 400; nulo y omitido son válidos', async () => {
      await expect(
        servicio.crear(dto({ rol_id: ROL_ID.asesor, tipo_asesor_id: 99 })),
      ).rejects.toThrow(BadRequestException);
      await expect(
        servicio.crear(dto({ rol_id: ROL_ID.asesor, tipo_asesor_id: null })),
      ).resolves.toBeDefined();
      await expect(servicio.crear(dto({ rol_id: ROL_ID.asesor }))).resolves.toBeDefined();
    });

    it('un tipo_asesor_id existente solo se acepta para asesores', async () => {
      await expect(
        servicio.crear(dto({ rol_id: ROL_ID.asesor, tipo_asesor_id: TIPO_ASESOR_EXISTENTE })),
      ).resolves.toMatchObject({ tipo_asesor_id: TIPO_ASESOR_EXISTENTE });
      await expect(
        servicio.crear(dto({ rol_id: ROL_ID.auxiliar, tipo_asesor_id: TIPO_ASESOR_EXISTENTE })),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('actualizar, obtener y listar', () => {
    it('CP-11 PATCH activo=false desactiva sin borrar al usuario', async () => {
      const creado = await servicio.crear(dto());
      const respuesta = await servicio.actualizar(creado.id, { activo: false });
      expect(respuesta.activo).toBe(false);
      expect(usuarios.filas).toHaveLength(1);
      expect(respuesta).not.toHaveProperty('contrasena_hash');
    });

    it('actualizar un usuario inexistente responde 404', async () => {
      await expect(
        servicio.actualizar('00000000-0000-4000-8000-0000000000ff', { activo: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('actualizar a un correo que ya usa otro usuario responde 409', async () => {
      const a = await servicio.crear(dto());
      const b = await servicio.crear(dto());
      await expect(
        servicio.actualizar(b.id, { correo_electronico: a.correo_electronico }),
      ).rejects.toThrow(ConflictException);
    });

    it('cambiar el rol a no asesor conservando un tipo_asesor_id responde 400', async () => {
      const asesor = await servicio.crear(
        dto({ rol_id: ROL_ID.asesor, tipo_asesor_id: TIPO_ASESOR_EXISTENTE }),
      );
      await expect(servicio.actualizar(asesor.id, { rol_id: ROL_ID.auxiliar })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('CP-11 el listado filtra por activo', async () => {
      const a = await servicio.crear(dto());
      const b = await servicio.crear(dto());
      await servicio.actualizar(b.id, { activo: false });

      expect((await servicio.listar({})).map((u) => u.id)).toEqual([a.id, b.id]);
      expect((await servicio.listar({ activo: true })).map((u) => u.id)).toEqual([a.id]);
      expect((await servicio.listar({ activo: false })).map((u) => u.id)).toEqual([b.id]);
    });

    it('obtener devuelve el usuario sin hash, o 404 si no existe', async () => {
      const creado = await servicio.crear(dto());
      expect(await servicio.obtener(creado.id)).not.toHaveProperty('contrasena_hash');
      await expect(servicio.obtener('00000000-0000-4000-8000-0000000000ff')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('catálogos', () => {
    it('CP-13 listarRoles devuelve los roles y listarTiposAsesor el catálogo (de solo lectura)', async () => {
      expect(await servicio.listarRoles()).toEqual(rolesDeLaSemilla);
      expect(await servicio.listarTiposAsesor()).toEqual([]);
    });
  });
});
