import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageAdapter } from './local-storage.adapter';
import { StorageService } from './storage.service';

// Adaptador local (por defecto en desarrollo): guarda los archivos bajo un directorio base.
describe('LocalStorageAdapter', () => {
  let base: string;
  let almacen: StorageService;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'h3ga-storage-'));
    almacen = new LocalStorageAdapter(base);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it('guarda y lee el mismo contenido, creando los subdirectorios de la clave', async () => {
    const contenido = Buffer.from('contenido ficticio');
    await almacen.guardar('clientes/c1/3-1700000000000.pdf', contenido, 'application/pdf');
    expect((await almacen.leer('clientes/c1/3-1700000000000.pdf')).equals(contenido)).toBe(true);
  });

  it('borrar elimina el archivo y es idempotente', async () => {
    await almacen.guardar('clientes/c1/a.png', Buffer.from('x'), 'image/png');
    await almacen.borrar('clientes/c1/a.png');
    await expect(almacen.leer('clientes/c1/a.png')).rejects.toThrow();
    await expect(almacen.borrar('clientes/c1/a.png')).resolves.toBeUndefined();
  });

  it('leer un archivo que no existe falla', async () => {
    await expect(almacen.leer('clientes/c1/no-existe.pdf')).rejects.toThrow();
  });

  it('rechaza claves que salgan del directorio base', async () => {
    for (const clave of ['../fuera.pdf', 'clientes/../../fuera.pdf', '/absoluta.pdf', 'a\\..\\b']) {
      await expect(almacen.guardar(clave, Buffer.from('x'), 'application/pdf')).rejects.toThrow(
        /clave/i,
      );
      await expect(almacen.leer(clave)).rejects.toThrow(/clave/i);
      await expect(almacen.borrar(clave)).rejects.toThrow(/clave/i);
    }
  });
});
