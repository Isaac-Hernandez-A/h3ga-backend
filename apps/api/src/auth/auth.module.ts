import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BcryptPasswordHasher, PasswordHasher } from '../common/seguridad/password-hasher';
import { Usuario } from '../usuarios-roles/entities/usuario.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Inicio de sesión: emite el token que validan los guards de ControlAccesoModule (que aporta JwtService).
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [AuthController],
  providers: [AuthService, { provide: PasswordHasher, useClass: BcryptPasswordHasher }],
})
export class AuthModule {}
