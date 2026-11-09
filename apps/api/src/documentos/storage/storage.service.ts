// Almacenamiento de archivos intercambiable (D6): local en desarrollo, DigitalOcean Spaces en producción.
// La clave sigue clientes/{clienteId}/{tipoDocumentoId}-{marcaDeTiempo}.{ext}.
export interface StorageService {
  guardar(clave: string, contenido: Buffer, tipoMime: string): Promise<void>;
  leer(clave: string): Promise<Buffer>;
  borrar(clave: string): Promise<void>;
}

// Token de inyección de StorageService (las interfaces no existen en tiempo de ejecución).
export const STORAGE_SERVICE = 'STORAGE_SERVICE';

// leer() lo lanza cuando la clave no existe; los demás fallos son errores genuinos de almacenamiento.
export class ArchivoNoEncontradoError extends Error {
  constructor(clave: string) {
    super(`No existe el archivo ${clave}.`);
    this.name = 'ArchivoNoEncontradoError';
  }
}
