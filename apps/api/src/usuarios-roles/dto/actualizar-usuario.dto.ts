import { OmitType, PartialType } from '@nestjs/swagger';
import { CrearUsuarioDto } from './crear-usuario.dto';

// El cambio de contraseña no se hace aquí (lo resuelve el módulo de autenticación).
export class ActualizarUsuarioDto extends PartialType(OmitType(CrearUsuarioDto, ['contrasena'])) {}
