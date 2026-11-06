import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { ClienteAccessGuard } from '../common/auth/cliente-access.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { RevisarDocumentoDto } from './dto/revisar-documento.dto';
import { SubirDocumentoDto } from './dto/subir-documento.dto';
import { DocumentoCliente } from './entities/documento-cliente.entity';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { ArchivoSubido, DocumentosService } from './documentos.service';
import { SubirArchivoInterceptor } from './subir-archivo.interceptor';

@ApiTags('documentos')
@UseGuards(ClienteAccessGuard)
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
  @ApiOperation({ summary: 'Obtener los datos de un documento' })
  @ApiOkResponse({ type: DocumentoCliente })
  obtenerDocumento(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
  ): Promise<DocumentoCliente> {
    return this.service.obtenerDocumento(clienteId, documentoId);
  }

  @Get('clientes/:clienteId/documentos/:documentoId/descargar')
  @Roles(...PERMISOS.documentos.leer)
  @ApiOperation({ summary: 'Descargar el archivo de un documento' })
  @ApiProduces('application/pdf', 'image/jpeg', 'image/png')
  @ApiOkResponse({ description: 'El archivo.' })
  async descargar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
  ): Promise<StreamableFile> {
    const { documento, contenido } = await this.service.descargar(usuario, clienteId, documentoId);
    return new StreamableFile(contenido, {
      type: documento.mime_type,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(documento.nombre_archivo_original)}`,
      length: contenido.length,
    });
  }

  @Post('clientes/:clienteId/documentos')
  @Roles(...PERMISOS.documentos.subir)
  @UseInterceptors(SubirArchivoInterceptor)
  @ApiOperation({
    summary:
      'Subir un documento del cliente (PDF, JPG o PNG, máximo 10 MB). Los tipos únicos reemplazan al anterior.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tipo_documento_id', 'archivo'],
      properties: {
        tipo_documento_id: { type: 'integer' },
        numero_referencia: { type: 'string' },
        observaciones: { type: 'string' },
        archivo: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: DocumentoCliente })
  subir(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: SubirDocumentoDto,
    @UploadedFile() archivo?: ArchivoSubido,
  ): Promise<DocumentoCliente> {
    if (!archivo) throw new BadRequestException('Falta el archivo (campo "archivo").');
    return this.service.subir(usuario, clienteId, dto.tipo_documento_id, archivo, {
      numero_referencia: dto.numero_referencia,
      observaciones: dto.observaciones,
    });
  }

  @Patch('clientes/:clienteId/documentos/:documentoId')
  @Roles(...PERMISOS.documentos.revisar)
  @ApiOperation({ summary: 'Revisar un documento: actualizar su estatus u observaciones' })
  @ApiOkResponse({ type: DocumentoCliente })
  revisar(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
    @Body() dto: RevisarDocumentoDto,
  ): Promise<DocumentoCliente> {
    return this.service.revisar(clienteId, documentoId, dto);
  }

  @Get('catalogos/tipos-documento')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar tipos de documento' })
  @ApiOkResponse({ type: TipoDocumento, isArray: true })
  listarTiposDocumento(): Promise<TipoDocumento[]> {
    return this.service.listarTiposDocumento();
  }
}
