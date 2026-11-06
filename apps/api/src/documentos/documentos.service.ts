import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { EstadoConfirmacion } from '../common/enums/db-enums';
import { RevisarDocumentoDto } from './dto/revisar-documento.dto';
import { DocumentoCliente } from './entities/documento-cliente.entity';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { limpiarNombre, TIPOS_DOCUMENTO_UNICOS, validarArchivo } from './reglas-archivo';
import {
  ArchivoNoEncontradoError,
  STORAGE_SERVICE,
  StorageService,
} from './storage/storage.service';

// Lo que el servicio necesita del archivo recibido (lo entrega multer con almacenamiento en memoria).
export interface ArchivoSubido {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class DocumentosService {
  private readonly log = new Logger(DocumentosService.name);

  constructor(
    @InjectRepository(DocumentoCliente) private readonly documentos: Repository<DocumentoCliente>,
    private readonly ds: DataSource,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async listarDocumentos(clienteId: string): Promise<DocumentoCliente[]> {
    return this.documentos.find({
      where: { cliente_id: clienteId },
      order: { fecha_carga: 'ASC', id: 'ASC' },
    });
  }

  async obtenerDocumento(clienteId: string, documentoId: string): Promise<DocumentoCliente> {
    const documento = await this.documentos.findOneBy({ id: documentoId, cliente_id: clienteId });
    if (!documento) throw new NotFoundException('Documento no encontrado.');
    return documento;
  }

  // Sube el archivo: primero al almacenamiento y luego, en UNA transacción, la fila. Los tipos de
  // documento únicos (acta, CURP, INE, domicilio, RFC, constancia de semanas) reemplazan al anterior: su
  // fila se sustituye y, ya confirmada la transacción, se borra el archivo viejo. Si algo falla antes de
  // confirmar, se borra el archivo nuevo y todo queda como estaba. Nace "por confirmar" hasta que se revise.
  async subir(
    usuario: AuthenticatedUser,
    clienteId: string,
    tipoDocumentoId: number,
    archivo: ArchivoSubido,
    extra: { numero_referencia?: string; observaciones?: string } = {},
  ): Promise<DocumentoCliente> {
    const tipo = await this.ds.getRepository(TipoDocumento).findOneBy({ id: tipoDocumentoId });
    if (!tipo) throw new BadRequestException('El tipo de documento indicado no existe.');
    const validacion = validarArchivo(archivo);
    if ('error' in validacion) throw new BadRequestException(validacion.error);

    const clave = `clientes/${clienteId}/${tipoDocumentoId}-${Date.now()}.${validacion.extension}`;
    await this.storage.guardar(clave, archivo.buffer, archivo.mimetype);

    let resultado: { nuevo: DocumentoCliente; reemplazados: string[] };
    try {
      resultado = await this.ds.transaction(async (manager) => {
        // Serializa las subidas del mismo cliente y tipo para que no queden dos vigentes.
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `${clienteId}:${tipoDocumentoId}`,
        ]);
        let viejos: DocumentoCliente[] = [];
        if (TIPOS_DOCUMENTO_UNICOS.includes(tipo.nombre)) {
          viejos = await manager.findBy(DocumentoCliente, {
            cliente_id: clienteId,
            tipo_documento_id: tipoDocumentoId,
          });
          if (viejos.length > 0) {
            await manager.delete(
              DocumentoCliente,
              viejos.map((v) => v.id),
            );
          }
        }
        const fila = await manager.save(
          manager.create(DocumentoCliente, {
            cliente_id: clienteId,
            tipo_documento_id: tipoDocumentoId,
            archivo_path: clave,
            nombre_archivo_original: limpiarNombre(archivo.originalname, validacion.extension),
            mime_type: archivo.mimetype,
            estatus: EstadoConfirmacion.POR_CONFIRMAR,
            numero_referencia: extra.numero_referencia ?? null,
            fecha_carga: new Date(),
            subido_por: usuario.sub,
            observaciones: extra.observaciones ?? null,
          }),
        );
        return { nuevo: fila, reemplazados: viejos.map((v) => v.archivo_path) };
      });
    } catch (error) {
      await this.storage.borrar(clave).catch(() => undefined);
      throw error;
    }

    for (const claveVieja of resultado.reemplazados) {
      await this.storage.borrar(claveVieja).catch(() => {
        // Un archivo huérfano no debe tumbar una subida que ya se confirmó.
        this.log.warn(`No se pudo borrar el archivo reemplazado ${claveVieja}.`);
      });
    }
    return resultado.nuevo;
  }

  // Revisión: estatus, observaciones y número de referencia. El archivo no se toca.
  async revisar(
    clienteId: string,
    documentoId: string,
    dto: RevisarDocumentoDto,
  ): Promise<DocumentoCliente> {
    if (Object.keys(dto).length > 0) {
      const { affected } = await this.documentos.update(
        { id: documentoId, cliente_id: clienteId },
        dto,
      );
      if (!affected) throw new NotFoundException('Documento no encontrado.');
    }
    return this.obtenerDocumento(clienteId, documentoId);
  }

  // El acceso al cliente lo validó ClienteAccessGuard; aquí el documento debe ser de ESE cliente.
  async descargar(
    _usuario: AuthenticatedUser,
    clienteId: string,
    documentoId: string,
  ): Promise<{ documento: DocumentoCliente; contenido: Buffer }> {
    const documento = await this.obtenerDocumento(clienteId, documentoId);
    try {
      return { documento, contenido: await this.storage.leer(documento.archivo_path) };
    } catch (error) {
      if (error instanceof ArchivoNoEncontradoError) {
        throw new NotFoundException('El archivo del documento no está disponible.');
      }
      throw error;
    }
  }

  async listarTiposDocumento(): Promise<TipoDocumento[]> {
    throw new NotImplementedException();
  }
}
