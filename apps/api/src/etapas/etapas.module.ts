import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TramitesModule } from '../tramites/tramites.module';
import { EtapasController } from './etapas.controller';
import { EtapasService } from './etapas.service';
import { EstatusTramite } from './entities/estatus-tramite.entity';
import { EtapaProceso } from './entities/etapa-proceso.entity';
import { EtapaTramite } from './entities/etapa-tramite.entity';
import { EtapaTramiteHistorial } from './entities/etapa-tramite-historial.entity';

@Module({
  imports: [
    TramitesModule,
    TypeOrmModule.forFeature([EstatusTramite, EtapaProceso, EtapaTramite, EtapaTramiteHistorial]),
  ],
  controllers: [EtapasController],
  providers: [EtapasService],
  exports: [TypeOrmModule],
})
export class EtapasModule {}
