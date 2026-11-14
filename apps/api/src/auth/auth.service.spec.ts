import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ROL_ID } from '../common/auth/roles-sistema';
import { PasswordHasher } from '../common/seguridad/password-hasher';
import { SECRETO_PRUEBA } from '../common/testing/tokens';
import { Usuario } from '../usuarios-roles/entities/usuario.entity';
import {
  AuthService,
  MENSAJE_CONTRASENA_ACTUAL,
  MENSAJE_CONTRASENA_IGUAL,
  MENSAJE_CREDENCIALES,
  MENSAJE_SESION_INVALIDA,
  VIGENCIA_TOKEN_S,
} from './auth.service';

// Pruebas del servicio con repositorio y hasher simulados. Datos ficticios.
const ID = '11111111-1111-4111-8111-111111111111';

function usuario(extra: Partial<Usuario> = {}): Usuario {
  return {
    id: ID,
    rol_id: ROL_ID.asesor,
    nombre: 'Ana',
    apellido_paterno: 'Ficticia',
    apellido_materno: 'Prueba',
    correo_electronico: 'ana@ejemplo.invalid',
    contrasena_hash: 'hash-ficticio',
    activo: true,
    ...extra,
  } as Usuario;
}

function crearServicio(encontrado: Usuario | null, coincide = true) {
  const consulta = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(() => Promise.resolve(encontrado)),
  };
  const repo = {
    createQueryBuilder: jest.fn(() => consulta),
    findOneBy: jest.fn(() => Promise.resolve(encontrado)),
    update: jest.fn(() => Promise.resolve({ affected: 1 })),
  };
  const hasher = {
    hash: jest.fn((plain: string) => Promise.resolve(`hash(${plain})`)),
    verify: jest.fn(() => Promise.resolve(coincide)),
  } as unknown as jest.Mocked<PasswordHasher>;
  const jwt = new JwtService({ secret: SECRETO_PRUEBA });
  const servicio = new AuthService(repo as never, jwt, hasher);
  return { servicio, hasher, jwt, consulta, repo };
}

describe('AuthService.iniciarSesion', () => {
  it('con credenciales válidas devuelve el token, la vigencia y el usuario', async () => {
    const { servicio, jwt } = crearServicio(usuario());
    const antes = Math.floor(Date.now() / 1000);
    const r = await servicio.iniciarSesion('ANA@ejemplo.invalid', 'contrasena-ficticia-123');
    expect(r.expires_in).toBe(VIGENCIA_TOKEN_S);
    expect(VIGENCIA_TOKEN_S).toBe(28800);
    expect(r.usuario).toEqual({ id: ID, nombre: 'Ana Ficticia', rol: 'asesor' });
    const payload = jwt.verify<{ sub: string; rol: string; exp: number }>(r.access_token);
    expect(payload.sub).toBe(ID);
    expect(payload.rol).toBe('asesor');
    expect(payload.exp).toBeGreaterThanOrEqual(antes + VIGENCIA_TOKEN_S);
    expect(payload.exp).toBeLessThanOrEqual(antes + VIGENCIA_TOKEN_S + 5);
  });

  it('busca el correo sin distinguir mayúsculas', async () => {
    const { servicio, consulta } = crearServicio(usuario());
    await servicio.iniciarSesion('Ana@Ejemplo.INVALID', 'x');
    expect(consulta.where).toHaveBeenCalledWith('LOWER(u.correo_electronico) = LOWER(:correo)', {
      correo: 'Ana@Ejemplo.INVALID',
    });
  });

  it('CP-71 usuario inexistente: compara contra un hash ficticio y responde el mismo 401', async () => {
    const { servicio, hasher } = crearServicio(null);
    await expect(servicio.iniciarSesion('nadie@ejemplo.invalid', 'x')).rejects.toThrow(
      new UnauthorizedException(MENSAJE_CREDENCIALES),
    );
    // El tiempo de respuesta no delata que el correo no existe: se hizo una comparación bcrypt.
    expect(hasher.verify).toHaveBeenCalledTimes(1);
  });

  it('CP-71 contraseña incorrecta y usuario inactivo responden el mismo 401', async () => {
    const mala = crearServicio(usuario(), false);
    await expect(mala.servicio.iniciarSesion('ana@ejemplo.invalid', 'x')).rejects.toThrow(
      new UnauthorizedException(MENSAJE_CREDENCIALES),
    );
    const inactivo = crearServicio(usuario({ activo: false }), true);
    await expect(inactivo.servicio.iniciarSesion('ana@ejemplo.invalid', 'x')).rejects.toThrow(
      new UnauthorizedException(MENSAJE_CREDENCIALES),
    );
    // También se compara con el hash real aunque el usuario esté inactivo.
    expect(inactivo.hasher.verify).toHaveBeenCalledTimes(1);
  });

  it('un rol_id desconocido no emite token: mismo 401', async () => {
    const { servicio } = crearServicio(usuario({ rol_id: 99 }));
    await expect(servicio.iniciarSesion('ana@ejemplo.invalid', 'x')).rejects.toThrow(
      new UnauthorizedException(MENSAJE_CREDENCIALES),
    );
  });
});

describe('AuthService.cambiarContrasena', () => {
  it('CP-86 con la actual correcta guarda el hash de la nueva en contrasena_hash', async () => {
    const { servicio, hasher, repo } = crearServicio(usuario(), true);
    await servicio.cambiarContrasena(ID, 'actual-ficticia-1', 'nueva-ficticia-123');
    expect(hasher.verify).toHaveBeenCalledWith('actual-ficticia-1', 'hash-ficticio');
    expect(repo.update).toHaveBeenCalledWith(ID, { contrasena_hash: 'hash(nueva-ficticia-123)' });
  });

  it('CP-87 la actual incorrecta responde 400 con su mensaje y no guarda nada', async () => {
    const { servicio, repo } = crearServicio(usuario(), false);
    await expect(
      servicio.cambiarContrasena(ID, 'mala-ficticia', 'nueva-ficticia-123'),
    ).rejects.toThrow(new BadRequestException(MENSAJE_CONTRASENA_ACTUAL));
    expect(MENSAJE_CONTRASENA_ACTUAL).toBe('La contraseña actual es incorrecta.');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('CP-88 la nueva igual a la actual responde 400 y no guarda nada', async () => {
    const { servicio, repo } = crearServicio(usuario(), true);
    await expect(
      servicio.cambiarContrasena(ID, 'misma-ficticia-1', 'misma-ficticia-1'),
    ).rejects.toThrow(new BadRequestException(MENSAJE_CONTRASENA_IGUAL));
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('CP-91 usuario inactivo o inexistente responde 401 y no guarda nada', async () => {
    for (const encontrado of [usuario({ activo: false }), null]) {
      const { servicio, repo } = crearServicio(encontrado, true);
      await expect(
        servicio.cambiarContrasena(ID, 'actual-ficticia-1', 'nueva-ficticia-123'),
      ).rejects.toThrow(new UnauthorizedException(MENSAJE_SESION_INVALIDA));
      expect(repo.update).not.toHaveBeenCalled();
    }
  });
});
