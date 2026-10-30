import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Rol } from './entities/rol.entity';
import { TipoAsesor } from './entities/tipo-asesor.entity';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsuariosRolesService {
  async listarUsuarios(): Promise<Usuario[]> {
    throw new NotImplementedException();
  }

  async obtenerUsuario(usuarioId: string): Promise<Usuario> {
    throw new NotImplementedException();
  }

  async crearUsuario(dto: CreateUsuarioDto): Promise<Usuario> {
    throw new NotImplementedException();
  }

  async actualizarUsuario(usuarioId: string, dto: UpdateUsuarioDto): Promise<Usuario> {
    throw new NotImplementedException();
  }

  async listarRoles(): Promise<Rol[]> {
    throw new NotImplementedException();
  }

  async listarTiposAsesor(): Promise<TipoAsesor[]> {
    throw new NotImplementedException();
  }
}
