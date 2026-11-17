import { Module } from '@nestjs/common';
import { ClientesModule } from '../clientes/clientes.module';
import { CargadorClientes } from './cargador';
import { EtlController } from './etl.controller';
import { EtlService } from './etl.service';

@Module({
  imports: [ClientesModule],
  controllers: [EtlController],
  providers: [EtlService, CargadorClientes],
})
export class EtlModule {}
