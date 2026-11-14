import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { DocumentoCliente } from './entities/documento-cliente.entity';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { crearStorage } from './storage/crear-storage';
import { STORAGE_SERVICE } from './storage/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentoCliente, TipoDocumento])],
  controllers: [DocumentosController],
  providers: [
    DocumentosService,
    // STORAGE_DRIVER=local (por defecto) o spaces; ver docs de despliegue y .env.example.
    { provide: STORAGE_SERVICE, useFactory: () => crearStorage(process.env) },
  ],
  exports: [TypeOrmModule],
})
export class DocumentosModule {}
