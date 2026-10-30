import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { CreateDocumentoClienteDto } from './dto/create-documento-cliente.dto';
import { UpdateDocumentoClienteDto } from './dto/update-documento-cliente.dto';
import { DocumentoCliente } from './entities/documento-cliente.entity';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { DocumentosService } from './documentos.service';

@ApiTags('documentos')
@Controller()
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get('clientes/:clienteId/documentos')
  @Roles(...PERMISOS.documentos.leer)
  @ApiOperation({ summary: 'Listar documentos del cliente' })
  @ApiOkResponse({ type: DocumentoCliente, isArray: true })
  listarDocumentos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<DocumentoCliente[]> {
    return this.service.listarDocumentos(clienteId);
  }

  @Get('clientes/:clienteId/documentos/:documentoId')
  @Roles(...PERMISOS.documentos.leer)
  @ApiOperation({ summary: 'Obtener un documento' })
  @ApiOkResponse({ type: DocumentoCliente })
  obtenerDocumento(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
  ): Promise<DocumentoCliente> {
    return this.service.obtenerDocumento(clienteId, documentoId);
  }

  @Post('clientes/:clienteId/documentos')
  @Roles(...PERMISOS.documentos.escribir)
  @ApiOperation({ summary: 'Registrar un documento del cliente' })
  @ApiCreatedResponse({ type: DocumentoCliente })
  crearDocumento(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateDocumentoClienteDto,
  ): Promise<DocumentoCliente> {
    return this.service.crearDocumento(clienteId, dto);
  }

  @Patch('clientes/:clienteId/documentos/:documentoId')
  @Roles(...PERMISOS.documentos.escribir)
  @ApiOperation({ summary: 'Actualizar el estatus u observaciones de un documento' })
  @ApiOkResponse({ type: DocumentoCliente })
  actualizarDocumento(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
    @Body() dto: UpdateDocumentoClienteDto,
  ): Promise<DocumentoCliente> {
    return this.service.actualizarDocumento(clienteId, documentoId, dto);
  }

  @Get('catalogos/tipos-documento')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar tipos de documento' })
  @ApiOkResponse({ type: TipoDocumento, isArray: true })
  listarTiposDocumento(): Promise<TipoDocumento[]> {
    return this.service.listarTiposDocumento();
  }
}
