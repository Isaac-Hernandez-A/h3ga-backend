import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaModule } from './agenda/agenda.module';
import { AvisosModule } from './avisos/avisos.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
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
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
