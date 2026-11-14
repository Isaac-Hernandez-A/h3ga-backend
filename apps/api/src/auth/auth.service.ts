import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROL_POR_ID } from '../common/auth/roles-sistema';
import { normalizarRol } from '../common/auth/normalizar-rol';
import { PasswordHasher } from '../common/seguridad/password-hasher';
import { Usuario } from '../usuarios-roles/entities/usuario.entity';
import { SesionRespuesta } from './dto/login.dto';

// Vigencia fijada en la especificación (D7): 8 horas, sin renovación.
export const VIGENCIA_TOKEN_S = 28800;
// Mismo mensaje para correo inexistente, contraseña incorrecta y usuario inactivo (D8).
export const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.';

// Cambio de contraseña propia. La actual incorrecta es 400 y no 401: el token es válido y el frontend
// cierra la sesión ante cualquier 401 con token.
export const MENSAJE_CONTRASENA_ACTUAL = 'La contraseña actual es incorrecta.';
export const MENSAJE_CONTRASENA_IGUAL = 'La contraseña nueva debe ser distinta de la actual.';
export const MENSAJE_SESION_INVALIDA = 'La sesión ya no es válida.';

// Hash bcrypt (costo 10) de una contraseña que nadie usa: cuando el correo no existe se compara contra
// él para que el tiempo de respuesta no delate si el correo está registrado.
const HASH_FICTICIO = '$2b$10$6t/wXXD7wBuXB.Nrmgae7uuqlyAAOGSMp51X4TJwWH92lWVznsA/K';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly jwt: JwtService,
    private readonly hasher: PasswordHasher,
  ) {}

  async iniciarSesion(correo: string, contrasena: string): Promise<SesionRespuesta> {
    // Sin distinguir mayúsculas; si dos correos solo difieren en ellas, gana el más antiguo.
    const usuario = await this.usuarios
      .createQueryBuilder('u')
      .where('LOWER(u.correo_electronico) = LOWER(:correo)', { correo: correo })
      .orderBy('u.fecha_creacion', 'ASC')
      .getOne();

    const coincide = await this.hasher.verify(
      contrasena,
      usuario?.contrasena_hash ?? HASH_FICTICIO,
    );
    // El claim "rol" sale del mapa rol_id -> rol del sistema y se confirma con normalizarRol, el mismo
    // punto por el que lo valida el guard.
    const rol = usuario ? normalizarRol(ROL_POR_ID[usuario.rol_id]) : null;
    if (!usuario || !usuario.activo || !coincide || !rol) {
      throw new UnauthorizedException(MENSAJE_CREDENCIALES);
    }

    const exp = Math.floor(Date.now() / 1000) + VIGENCIA_TOKEN_S;
    return {
      access_token: this.jwt.sign({ sub: usuario.id, rol, exp }),
      expires_in: VIGENCIA_TOKEN_S,
      usuario: { id: usuario.id, nombre: `${usuario.nombre} ${usuario.apellido_paterno}`, rol },
    };
  }

  // Cambia la contraseña del usuario del token. Un usuario inexistente o inactivo no puede (mismo criterio
  // que el login: no hay sesión válida) y recibe 401.
  async cambiarContrasena(usuarioId: string, actual: string, nueva: string): Promise<void> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario || !usuario.activo) throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    if (!(await this.hasher.verify(actual, usuario.contrasena_hash))) {
      throw new BadRequestException(MENSAJE_CONTRASENA_ACTUAL);
    }
    if (nueva === actual) throw new BadRequestException(MENSAJE_CONTRASENA_IGUAL);
    await this.usuarios.update(usuario.id, { contrasena_hash: await this.hasher.hash(nueva) });
  }
}
