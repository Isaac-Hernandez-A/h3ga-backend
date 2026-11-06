import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { inspect } from 'node:util';
import { crearStorage } from './crear-storage';
import { LocalStorageAdapter } from './local-storage.adapter';
import { SpacesStorageAdapter } from './spaces-storage.adapter';

// Adaptador de DigitalOcean Spaces con un cliente S3 SIMULADO: no se llama a DigitalOcean.
const SECRETO = 'secreto-ficticio-que-nunca-debe-salir';
const LLAVE = 'llave-ficticia-que-nunca-debe-salir';

class ClienteS3Simulado {
  enviados: unknown[] = [];
  contenido = Buffer.from('archivo ficticio');
  fallar = false;
  send(comando: unknown): Promise<unknown> {
    this.enviados.push(comando);
    if (this.fallar) return Promise.reject(new Error(`403 con credenciales ${LLAVE}:${SECRETO}`));
    if (comando instanceof GetObjectCommand) {
      return Promise.resolve({
        Body: { transformToByteArray: () => Promise.resolve(new Uint8Array(this.contenido)) },
      });
    }
    return Promise.resolve({});
  }
}

describe('SpacesStorageAdapter', () => {
  it('CP-49 guarda, lee y borra con la clave esperada en el bucket configurado', async () => {
    const cliente = new ClienteS3Simulado();
    const almacen = new SpacesStorageAdapter(cliente, 'bucket-ficticio');
    const clave = 'clientes/11111111-1111-4111-8111-111111111111/3-1700000000000.pdf';

    await almacen.guardar(clave, Buffer.from('hola'), 'application/pdf');
    const leido = await almacen.leer(clave);
    await almacen.borrar(clave);

    const [poner, obtener, borrar] = cliente.enviados;
    expect(poner).toBeInstanceOf(PutObjectCommand);
    expect((poner as PutObjectCommand).input).toMatchObject({
      Bucket: 'bucket-ficticio',
      Key: clave,
      ContentType: 'application/pdf',
    });
    expect(Buffer.from((poner as PutObjectCommand).input.Body as Buffer).toString()).toBe('hola');
    expect(obtener).toBeInstanceOf(GetObjectCommand);
    expect((obtener as GetObjectCommand).input).toMatchObject({
      Bucket: 'bucket-ficticio',
      Key: clave,
    });
    expect(leido.equals(cliente.contenido)).toBe(true);
    expect(borrar).toBeInstanceOf(DeleteObjectCommand);
    expect((borrar as DeleteObjectCommand).input).toMatchObject({
      Bucket: 'bucket-ficticio',
      Key: clave,
    });
  });

  it('CP-49 nunca expone credenciales: ni en el objeto ni en los errores', async () => {
    const env = {
      STORAGE_DRIVER: 'spaces',
      SPACES_KEY: LLAVE,
      SPACES_SECRET: SECRETO,
      SPACES_REGION: 'nyc3',
      SPACES_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
      SPACES_BUCKET: 'bucket-ficticio',
    };
    const almacen = crearStorage(env);
    expect(almacen).toBeInstanceOf(SpacesStorageAdapter);
    const serializado = inspect(almacen, { depth: 12, maxArrayLength: null }) + String(almacen);
    expect(serializado).not.toContain(SECRETO);
    expect(serializado).not.toContain(LLAVE);

    const cliente = new ClienteS3Simulado();
    cliente.fallar = true;
    const conFallo = new SpacesStorageAdapter(cliente, 'bucket-ficticio');
    for (const operacion of [
      () => conFallo.guardar('clientes/c/a.pdf', Buffer.from('x'), 'application/pdf'),
      () => conFallo.leer('clientes/c/a.pdf'),
      () => conFallo.borrar('clientes/c/a.pdf'),
    ]) {
      const error = await operacion().catch((e: Error) => e);
      expect(error).toBeInstanceOf(Error);
      const texto = inspect(error, { depth: 12 });
      expect(texto).not.toContain(SECRETO);
      expect(texto).not.toContain(LLAVE);
      expect((error as Error).message).toContain('clientes/c/a.pdf');
    }
  });
});

describe('crearStorage', () => {
  it('usa el almacenamiento local por defecto y con STORAGE_DRIVER=local', () => {
    expect(crearStorage({})).toBeInstanceOf(LocalStorageAdapter);
    expect(crearStorage({ STORAGE_DRIVER: 'local' })).toBeInstanceOf(LocalStorageAdapter);
  });

  it('con spaces exige todas las variables SPACES_* y nombra solo cuáles faltan', () => {
    expect(() => crearStorage({ STORAGE_DRIVER: 'spaces', SPACES_KEY: LLAVE })).toThrow(
      /SPACES_SECRET/,
    );
    try {
      crearStorage({ STORAGE_DRIVER: 'spaces', SPACES_KEY: LLAVE, SPACES_SECRET: SECRETO });
    } catch (error) {
      expect((error as Error).message).not.toContain(SECRETO);
      expect((error as Error).message).not.toContain(LLAVE);
    }
  });

  it('un STORAGE_DRIVER desconocido falla', () => {
    expect(() => crearStorage({ STORAGE_DRIVER: 's3' })).toThrow(/STORAGE_DRIVER/);
  });
});
