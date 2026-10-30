import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosRolesController } from './usuarios-roles.controller';
import { UsuariosRolesService } from './usuarios-roles.service';
import { Rol } from './entities/rol.entity';
import { TipoAsesor } from './entities/tipo-asesor.entity';
import { Usuario } from './entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rol, TipoAsesor, Usuario])],
  controllers: [UsuariosRolesController],
  providers: [UsuariosRolesService],
  exports: [TypeOrmModule],
})
export class UsuariosRolesModule {}
