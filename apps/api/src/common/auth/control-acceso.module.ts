import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { ClienteAuxiliar } from '../../clientes/entities/cliente-auxiliar.entity';
import { ClienteAccessGuard } from './cliente-access.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

// Control de acceso: solo VALIDA tokens. No hay login ni emisión de tokens (es de otro módulo).
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
    }),
    TypeOrmModule.forFeature([Cliente, ClienteAuxiliar]),
  ],
  providers: [JwtAuthGuard, RolesGuard, ClienteAccessGuard],
  exports: [JwtAuthGuard, RolesGuard, ClienteAccessGuard, JwtModule],
})
export class ControlAccesoModule {}
