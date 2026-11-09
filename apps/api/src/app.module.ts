import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaModule } from './agenda/agenda.module';
import { AvisosModule } from './avisos/avisos.module';
import { ControlAccesoModule } from './common/auth/control-acceso.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { validarEntorno } from './common/config/validar-entorno';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ClientesModule } from './clientes/clientes.module';
import { DiagnosticosModule } from './diagnosticos/diagnosticos.module';
import { DocumentosModule } from './documentos/documentos.module';
import { EtapasModule } from './etapas/etapas.module';
import { EtlModule } from './etl/etl.module';
import { HealthController } from './health/health.controller';
import { ReportesModule } from './reportes/reportes.module';
import { TramitesModule } from './tramites/tramites.module';
import { UsuariosRolesModule } from './usuarios-roles/usuarios-roles.module';

// Módulos de dominio y proveedores globales de la aplicación. Se exportan para que las pruebas de acceso
// monten exactamente los mismos, sin la conexión a la base de datos.
export const MODULOS_DE_DOMINIO = [
  UsuariosRolesModule,
  ClientesModule,
  DocumentosModule,
  EtapasModule,
  TramitesModule,
  DiagnosticosModule,
  AgendaModule,
  AvisosModule,
  ReportesModule,
  EtlModule,
];

// Guards globales, en este orden: primero la identidad (JWT), luego el rol. El acceso por cliente
// (ClienteAccessGuard) se declara en los controladores con rutas :clienteId.
export const PROVEEDORES_GLOBALES: Provider[] = [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_FILTER, useClass: AllExceptionsFilter },
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validarEntorno,
    }),
    ControlAccesoModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // CLAUDE.md regla 1: el esquema solo cambia con migraciones SQL versionadas.
        synchronize: false,
        migrationsRun: false,
        uuidExtension: 'pgcrypto' as const,
      }),
    }),
    ...MODULOS_DE_DOMINIO,
  ],
  controllers: [HealthController],
  providers: PROVEEDORES_GLOBALES,
})
export class AppModule {}
