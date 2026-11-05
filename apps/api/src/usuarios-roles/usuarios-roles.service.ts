import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ROL_ID } from '../common/auth/roles-sistema';
import { PasswordHasher } from '../common/seguridad/password-hasher';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuarioRespuesta } from './dto/usuario-respuesta.dto';
import { Rol } from './entities/rol.entity';
import { TipoAsesor } from './entities/tipo-asesor.entity';
import { Usuario } from './entities/usuario.entity';

// Códigos de error de PostgreSQL que el servicio traduce a respuestas HTTP.
const VIOLACION_UNICA = '23505';
const VIOLACION_LLAVE_FORANEA = '23503';

function codigoPostgres(error: unknown): string | undefined {
  if (!(error instanceof QueryFailedError)) return undefined;
  const { driverError, code } = error as QueryFailedError & {
    driverError?: { code?: string };
    code?: string;
  };
  return driverError?.code ?? code;
}

// Mapea la entidad a la respuesta pública: solo se copian campos conocidos, nunca contrasena_hash.
function aRespuesta(usuario: Usuario): UsuarioRespuesta {
  return {
    id: usuario.id,
    rol_id: usuario.rol_id,
    tipo_asesor_id: usuario.tipo_asesor_id ?? null,
    nombre: usuario.nombre,
    apellido_paterno: usuario.apellido_paterno,
    apellido_materno: usuario.apellido_materno,
    correo_electronico: usuario.correo_electronico,
    activo: usuario.activo,
    fecha_creacion: usuario.fecha_creacion,
  };
}

@Injectable()
export class UsuariosRolesService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Rol) private readonly roles: Repository<Rol>,
    @InjectRepository(TipoAsesor) private readonly tiposAsesor: Repository<TipoAsesor>,
    private readonly hasher: PasswordHasher,
  ) {}

  async crear(dto: CrearUsuarioDto): Promise<UsuarioRespuesta> {
    const tipoAsesorId = dto.tipo_asesor_id ?? null;
    await this.validarRolYTipoAsesor(dto.rol_id, tipoAsesorId);

    const usuario = this.usuarios.create({
      rol_id: dto.rol_id,
      tipo_asesor_id: tipoAsesorId,
      nombre: dto.nombre,
      apellido_paterno: dto.apellido_paterno,
      apellido_materno: dto.apellido_materno,
      correo_electronico: dto.correo_electronico,
      contrasena_hash: await this.hasher.hash(dto.contrasena),
      activo: dto.activo ?? true,
      fecha_creacion: new Date(),
    });
    return aRespuesta(await this.guardar(usuario));
  }

  async listar(filtro: { activo?: boolean }): Promise<UsuarioRespuesta[]> {
    const usuarios = await this.usuarios.find({
      where: filtro.activo === undefined ? {} : { activo: filtro.activo },
      order: { correo_electronico: 'ASC' },
    });
    return usuarios.map(aRespuesta);
  }

  async obtener(usuarioId: string): Promise<UsuarioRespuesta> {
    return aRespuesta(await this.buscar(usuarioId));
  }

  async actualizar(usuarioId: string, dto: ActualizarUsuarioDto): Promise<UsuarioRespuesta> {
    const usuario = await this.buscar(usuarioId);

    if (dto.rol_id !== undefined || dto.tipo_asesor_id !== undefined) {
      const rolId = dto.rol_id ?? usuario.rol_id;
      const tipoAsesorId =
        dto.tipo_asesor_id !== undefined ? dto.tipo_asesor_id : usuario.tipo_asesor_id;
      await this.validarRolYTipoAsesor(rolId, tipoAsesorId ?? null);
    }

    const cambios = Object.fromEntries(
      Object.entries(dto).filter(([, valor]) => valor !== undefined),
    );
    return aRespuesta(await this.guardar(Object.assign(usuario, cambios)));
  }

  listarRoles(): Promise<Rol[]> {
    return this.roles.find({ order: { id: 'ASC' } });
  }

  // tipos_asesor es de otro módulo: aquí solo se lee.
  listarTiposAsesor(): Promise<TipoAsesor[]> {
    return this.tiposAsesor.find({ order: { id: 'ASC' } });
  }

  private async buscar(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    return usuario;
  }

  // El rol debe existir; tipo_asesor_id solo aplica a asesores (diccionario) y debe existir si se indica.
  private async validarRolYTipoAsesor(rolId: number, tipoAsesorId: number | null): Promise<void> {
    if (!(await this.roles.existsBy({ id: rolId }))) {
      throw new BadRequestException('rol_id no existe.');
    }
    if (tipoAsesorId === null) return;
    if (rolId !== ROL_ID.asesor) {
      throw new BadRequestException('tipo_asesor_id solo aplica a usuarios con rol asesor.');
    }
    if (!(await this.tiposAsesor.existsBy({ id: tipoAsesorId }))) {
      throw new BadRequestException('tipo_asesor_id no existe.');
    }
  }

  // La unicidad del correo la garantiza la base de datos; aquí se traduce su error (también ante una carrera).
  private async guardar(usuario: Usuario): Promise<Usuario> {
    try {
      return await this.usuarios.save(usuario);
    } catch (error) {
      const codigo = codigoPostgres(error);
      if (codigo === VIOLACION_UNICA) {
        throw new ConflictException('Ya existe un usuario con ese correo electrónico.');
      }
      if (codigo === VIOLACION_LLAVE_FORANEA) {
        throw new BadRequestException('rol_id o tipo_asesor_id no existe.');
      }
      throw error;
    }
  }
}
