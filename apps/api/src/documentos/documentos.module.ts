import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { DocumentoCliente } from './entities/documento-cliente.entity';
import { TipoDocumento } from './entities/tipo-documento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentoCliente, TipoDocumento])],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [TypeOrmModule],
})
export class DocumentosModule {}
