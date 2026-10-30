import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TramitesController } from './tramites.controller';
import { TramitesService } from './tramites.service';
import { CorreccionCliente } from './entities/correccion-cliente.entity';
import { TipoCorreccion } from './entities/tipo-correccion.entity';
import { UnificacionNssDetalle } from './entities/unificacion-nss-detalle.entity';
import { UnificacionNssSecundario } from './entities/unificacion-nss-secundario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CorreccionCliente,
      TipoCorreccion,
      UnificacionNssDetalle,
      UnificacionNssSecundario,
    ]),
  ],
  controllers: [TramitesController],
  providers: [TramitesService],
  exports: [TypeOrmModule],
})
export class TramitesModule {}
