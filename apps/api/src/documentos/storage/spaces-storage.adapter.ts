import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ArchivoNoEncontradoError, StorageService } from './storage.service';

// Lo único que el adaptador necesita del cliente S3: enviar comandos. Permite probarlo con un simulado.
export interface ClienteS3 {
  send(comando: unknown): Promise<unknown>;
}

// Adaptador de DigitalOcean Spaces (API compatible con S3). No guarda credenciales: viven solo dentro del
// cliente S3 (ver crearClienteS3). Los errores se reescriben para que nunca arrastren datos de la petición.
export class SpacesStorageAdapter implements StorageService {
  constructor(
    private readonly cliente: ClienteS3,
    private readonly bucket: string,
  ) {}

  async guardar(clave: string, contenido: Buffer, tipoMime: string): Promise<void> {
    await this.enviar(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: clave,
        Body: contenido,
        ContentType: tipoMime,
      }),
      `No se pudo guardar el archivo ${clave} en Spaces.`,
    );
  }

  async leer(clave: string): Promise<Buffer> {
    const respuesta = (await this.enviar(
      new GetObjectCommand({ Bucket: this.bucket, Key: clave }),
      `No se pudo leer el archivo ${clave} de Spaces.`,
      clave,
    )) as { Body?: { transformToByteArray(): Promise<Uint8Array> } };
    if (!respuesta.Body) throw new ArchivoNoEncontradoError(clave);
    return Buffer.from(await respuesta.Body.transformToByteArray());
  }

  async borrar(clave: string): Promise<void> {
    await this.enviar(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }),
      `No se pudo borrar el archivo ${clave} de Spaces.`,
    );
  }

  private async enviar(comando: unknown, mensaje: string, claveSiNoExiste?: string) {
    try {
      return await this.cliente.send(comando);
    } catch (error) {
      const nombre = (error as { name?: string }).name;
      if (claveSiNoExiste && (nombre === 'NoSuchKey' || nombre === 'NotFound')) {
        throw new ArchivoNoEncontradoError(claveSiNoExiste);
      }
      // Sin "cause" a propósito: el error original puede incluir detalles de la petición firmada.
      // eslint-disable-next-line preserve-caught-error
      throw new Error(mensaje);
    }
  }
}

export interface ConfiguracionSpaces {
  SPACES_KEY: string;
  SPACES_SECRET: string;
  SPACES_REGION: string;
  SPACES_ENDPOINT: string;
  SPACES_BUCKET: string;
}

// Cliente S3 real apuntando a Spaces. Las credenciales salen del entorno y no se guardan en ningún otro lado.
export function crearClienteS3(config: ConfiguracionSpaces): S3Client {
  return new S3Client({
    region: config.SPACES_REGION,
    endpoint: config.SPACES_ENDPOINT,
    credentials: { accessKeyId: config.SPACES_KEY, secretAccessKey: config.SPACES_SECRET },
  });
}
