import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { ArchivoNoEncontradoError, StorageService } from './storage.service';

// Guarda los archivos bajo un directorio base del disco. Pensado para desarrollo y pruebas.
export class LocalStorageAdapter implements StorageService {
  private readonly base: string;

  constructor(directorioBase: string) {
    this.base = resolve(directorioBase);
  }

  async guardar(clave: string, contenido: Buffer): Promise<void> {
    const ruta = this.rutaDe(clave);
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, contenido);
  }

  async leer(clave: string): Promise<Buffer> {
    try {
      return await readFile(this.rutaDe(clave));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ArchivoNoEncontradoError(clave);
      }
      throw error;
    }
  }

  async borrar(clave: string): Promise<void> {
    await rm(this.rutaDe(clave), { force: true });
  }

  // La clave nunca puede salir del directorio base (sin "..", rutas absolutas ni barras invertidas).
  private rutaDe(clave: string): string {
    const segmentos = clave.split('/');
    const invalida =
      clave === '' ||
      clave.startsWith('/') ||
      clave.includes('\\') ||
      clave.includes('\0') ||
      segmentos.some((s) => s === '' || s === '.' || s === '..');
    const ruta = resolve(this.base, clave);
    if (invalida || !ruta.startsWith(this.base + sep)) {
      throw new Error('Clave de almacenamiento inválida.');
    }
    return ruta;
  }
}
