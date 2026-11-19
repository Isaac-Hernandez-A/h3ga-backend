import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesModule } from '../reportes/reportes.module';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { Afore } from './entities/afore.entity';
import { Cliente } from './entities/cliente.entity';
import { ClienteAuxiliar } from './entities/cliente-auxiliar.entity';
import { ClienteObjetivoEspecifico } from './entities/cliente-objetivo-especifico.entity';
import { HistorialLaboral } from './entities/historial-laboral.entity';
import { InformacionIssste } from './entities/informacion-issste.entity';
import { LeyProbable } from './entities/ley-probable.entity';
import { ObjetivoEspecificoInicial } from './entities/objetivo-especifico-inicial.entity';
import { RegimenPrincipal } from './entities/regimen-principal.entity';

@Module({
  imports: [
    ReportesModule,
    TypeOrmModule.forFeature([
      Afore,
      Cliente,
      ClienteAuxiliar,
      ClienteObjetivoEspecifico,
      HistorialLaboral,
      InformacionIssste,
      LeyProbable,
      ObjetivoEspecificoInicial,
      RegimenPrincipal,
    ]),
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [TypeOrmModule, ClientesService],
})
export class ClientesModule {}
