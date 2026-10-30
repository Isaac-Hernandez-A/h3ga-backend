import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateDocumentoClienteDto } from './dto/create-documento-cliente.dto';
import { UpdateDocumentoClienteDto } from './dto/update-documento-cliente.dto';
import { DocumentoCliente } from './entities/documento-cliente.entity';
import { TipoDocumento } from './entities/tipo-documento.entity';

@Injectable()
export class DocumentosService {
  async listarDocumentos(clienteId: string): Promise<DocumentoCliente[]> {
    throw new NotImplementedException();
  }

  async obtenerDocumento(clienteId: string, documentoId: string): Promise<DocumentoCliente> {
    throw new NotImplementedException();
  }

  async crearDocumento(
    clienteId: string,
    dto: CreateDocumentoClienteDto,
  ): Promise<DocumentoCliente> {
    throw new NotImplementedException();
  }

  async actualizarDocumento(
    clienteId: string,
    documentoId: string,
    dto: UpdateDocumentoClienteDto,
  ): Promise<DocumentoCliente> {
    throw new NotImplementedException();
  }

  async listarTiposDocumento(): Promise<TipoDocumento[]> {
    throw new NotImplementedException();
  }
}
