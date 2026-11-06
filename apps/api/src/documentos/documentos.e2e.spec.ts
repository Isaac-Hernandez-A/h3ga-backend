import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Flujo HTTP real (AppModule completo) del repositorio documental, con almacenamiento local en un
// directorio temporal. Solo archivos ficticios.
jest.setTimeout(90_000);

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('contenido ficticio')]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('x'),
]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('x')]);
const MB = 1024 * 1024;

interface Documento {
  id: string;
  cliente_id: string;
  tipo_documento_id: number;
  archivo_path: string;
  nombre_archivo_original: string;
  mime_type: string;
  estatus: string;
  observaciones: string | null;
  subido_por: string;
}

describeConBd('Documentos (aplicación real, base de pruebas y almacenamiento local)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let dirAlmacen: string;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);
  const tipo: Record<string, number> = {};

  async function subir(
    clienteId: string,
    u: UsuarioPrueba,
    tipoNombre: string,
    contenido: Buffer,
    mime: string,
    nombre = 'archivo.pdf',
    extra: Record<string, string> = {},
  ) {
    const form = new FormData();
    form.append('tipo_documento_id', String(tipo[tipoNombre]));
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    form.append('archivo', new Blob([new Uint8Array(contenido)], { type: mime }), nombre);
    const r = await fetch(`${ctx.base}/clientes/${clienteId}/documentos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t(u)}` },
      body: form,
    });
    const texto = await r.text();
    return { estado: r.status, json: (texto ? JSON.parse(texto) : {}) as Documento };
  }
  async function pedir(metodo: string, ruta: string, u: UsuarioPrueba, datos?: object) {
    const r = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${t(u)}`,
        ...(datos ? { 'Content-Type': 'application/json' } : {}),
      },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    return r;
  }
  const archivosEnDisco = async (clienteId: string): Promise<string[]> =>
    readdir(join(dirAlmacen, 'clientes', clienteId)).catch(() => []);
  const filas = (clienteId: string, tipoNombre: string) =>
    ctx.ds.query<Documento[]>(
      'SELECT * FROM documentos_clientes WHERE cliente_id = $1 AND tipo_documento_id = $2',
      [clienteId, tipo[tipoNombre]],
    );

  beforeAll(async () => {
    dirAlmacen = await mkdtemp(join(tmpdir(), 'h3ga-docs-'));
    process.env.STORAGE_DRIVER = 'local';
    process.env.STORAGE_LOCAL_DIR = dirAlmacen;
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    const tipos = await ctx.ds.query<{ id: number; nombre: string }[]>(
      'SELECT id, nombre FROM tipo_documento',
    );
    tipos.forEach((f) => (tipo[f.nombre] = f.id));
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
    await rm(dirAlmacen, { recursive: true, force: true });
  });

  it('CP-44 subir un archivo nuevo del mismo tipo reemplaza al anterior: queda una fila vigente y el archivo viejo se borra', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const uno = await subir(clienteId, asesor, 'CURP', PDF, 'application/pdf', 'curp-1.pdf');
    expect(uno.estado).toBe(201);
    expect(await archivosEnDisco(clienteId)).toHaveLength(1);

    await new Promise((r) => setTimeout(r, 5)); // otra marca de tiempo en la clave
    const dos = await subir(clienteId, asesor, 'CURP', PNG, 'image/png', 'curp-2.png');
    expect(dos.estado).toBe(201);
    expect(dos.json.id).not.toBe(uno.json.id);

    const vigentes = await filas(clienteId, 'CURP');
    expect(vigentes).toHaveLength(1);
    expect(vigentes[0].id).toBe(dos.json.id);
    const enDisco = await archivosEnDisco(clienteId);
    expect(enDisco).toHaveLength(1);
    expect(dos.json.archivo_path).toMatch(
      new RegExp(`^clientes/${clienteId}/${tipo['CURP']}-\\d+\\.png$`),
    );
    expect(enDisco[0]).toBe(dos.json.archivo_path.split('/').pop());
  });

  it('los tipos con varios documentos (p. ej. recibos de nómina) se acumulan en vez de reemplazarse', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const nomina = 'Recibos de Nómina / Constancias Laborales';
    expect((await subir(clienteId, asesor, nomina, PDF, 'application/pdf')).estado).toBe(201);
    await new Promise((r) => setTimeout(r, 5));
    expect((await subir(clienteId, asesor, nomina, JPG, 'image/jpeg', 'n2.jpg')).estado).toBe(201);
    expect(await filas(clienteId, nomina)).toHaveLength(2);
    expect(await archivosEnDisco(clienteId)).toHaveLength(2);
  });

  it('dos subidas simultáneas del mismo tipo dejan una sola fila vigente y un solo archivo', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const [a, b] = await Promise.all([
      subir(clienteId, asesor, 'RFC', PDF, 'application/pdf', 'a.pdf'),
      subir(clienteId, asesor, 'RFC', PNG, 'image/png', 'b.png'),
    ]);
    expect([a.estado, b.estado]).toEqual([201, 201]);
    expect(await filas(clienteId, 'RFC')).toHaveLength(1);
    expect(await archivosEnDisco(clienteId)).toHaveLength(1);
  });

  it('CP-45 tipo distinto de PDF, JPG o PNG, o más de 10 MB, responde 400', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const texto = Buffer.from('texto plano');
    expect((await subir(clienteId, asesor, 'INE', texto, 'text/plain', 'a.txt')).estado).toBe(400);
    expect((await subir(clienteId, asesor, 'INE', PDF, 'application/zip', 'a.zip')).estado).toBe(
      400,
    );
    // El tipo declarado no basta: el contenido debe ser realmente del formato.
    expect(
      (await subir(clienteId, asesor, 'INE', texto, 'application/pdf', 'falso.pdf')).estado,
    ).toBe(400);
    expect((await subir(clienteId, asesor, 'INE', PNG, 'application/pdf', 'otro.pdf')).estado).toBe(
      400,
    );

    const justo = Buffer.concat([PDF, Buffer.alloc(10 * MB - PDF.length)]);
    const pasado = Buffer.concat([PDF, Buffer.alloc(10 * MB - PDF.length + 1)]);
    const muyGrande = Buffer.concat([PDF, Buffer.alloc(12 * MB)]);
    expect((await subir(clienteId, asesor, 'INE', justo, 'application/pdf')).estado).toBe(201);
    expect(
      (await subir(clienteId, asesor, 'Acta de Nacimiento', pasado, 'application/pdf')).estado,
    ).toBe(400);
    expect(
      (await subir(clienteId, asesor, 'Acta de Nacimiento', muyGrande, 'application/pdf')).estado,
    ).toBe(400);

    // Sin archivo, o con un tipo de documento inexistente, también es 400 y no deja nada.
    const sinArchivo = await fetch(`${ctx.base}/clientes/${clienteId}/documentos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t(asesor)}` },
      body: (() => {
        const f = new FormData();
        f.append('tipo_documento_id', String(tipo['INE']));
        return f;
      })(),
    });
    expect(sinArchivo.status).toBe(400);
    const form = new FormData();
    form.append('tipo_documento_id', '30000');
    form.append('archivo', new Blob([new Uint8Array(PDF)], { type: 'application/pdf' }), 'a.pdf');
    const inexistente = await fetch(`${ctx.base}/clientes/${clienteId}/documentos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t(asesor)}` },
      body: form,
    });
    expect(inexistente.status).toBe(400);
    expect(await filas(clienteId, 'Acta de Nacimiento')).toHaveLength(0);
    expect(await archivosEnDisco(clienteId)).toHaveLength(1); // solo el de 10 MB exactos
  });

  it('el nombre original se guarda sin rutas ni caracteres de control y la clave no depende de él', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const r = await subir(
      clienteId,
      asesor,
      'RFC',
      PDF,
      'application/pdf',
      '..\\..\\etc/pass\twd.pdf',
    );
    expect(r.estado).toBe(201);
    expect(r.json.nombre_archivo_original).toBe('passwd.pdf');
    expect(r.json.archivo_path).toMatch(/^clientes\/[0-9a-f-]+\/\d+-\d+\.pdf$/);
  });

  it('CP-46 asesor y auxiliar (autorizado) suben; el supervisor no sube (403) pero sí revisa', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    expect((await subir(clienteId, asesor, 'INE', PDF, 'application/pdf')).estado).toBe(201);

    // Auxiliar sin autorización: 404 (no se revela el cliente); con ella, sube y queda como autor.
    expect((await subir(clienteId, auxiliar, 'RFC', PDF, 'application/pdf')).estado).toBe(404);
    await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);
    const delAux = await subir(clienteId, auxiliar, 'RFC', PDF, 'application/pdf');
    expect(delAux.estado).toBe(201);
    expect(delAux.json.subido_por).toBe(auxiliar.id);

    expect((await subir(clienteId, supervisor, 'CURP', PDF, 'application/pdf')).estado).toBe(403);
    expect((await filas(clienteId, 'CURP')).length).toBe(0);

    const revisado = await pedir(
      'PATCH',
      `/clientes/${clienteId}/documentos/${delAux.json.id}`,
      supervisor,
      { estatus: 'si' },
    );
    expect(revisado.status).toBe(200);
  });

  it('CP-47 revisar actualiza estatus y observaciones del documento', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const doc = await subir(clienteId, asesor, 'INE', PDF, 'application/pdf');
    expect(doc.json.estatus).toBe('por_confirmar');

    const ruta = `/clientes/${clienteId}/documentos/${doc.json.id}`;
    const ok = await pedir('PATCH', ruta, asesor, {
      estatus: 'si',
      observaciones: 'Legible y vigente',
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ estatus: 'si', observaciones: 'Legible y vigente' });

    // Solo se revisa: el archivo, su tipo y quién lo subió no se tocan por PATCH.
    for (const malo of [{ archivo_path: 'x' }, { tipo_documento_id: 1 }, { estatus: 'quizá' }]) {
      expect((await pedir('PATCH', ruta, asesor, malo)).status).toBe(400);
    }
    expect((await pedir('PATCH', ruta, otroAsesor, { estatus: 'no' })).status).toBe(404);
    const guardado = await filas(clienteId, 'INE');
    expect(guardado[0]).toMatchObject({ estatus: 'si', observaciones: 'Legible y vigente' });
  });

  it('CP-48 descargar el documento de un cliente ajeno responde 404', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const otroCliente = await insertarCliente(ctx.ds, catalogo, otroAsesor.id);
    const doc = await subir(clienteId, asesor, 'INE', PDF, 'application/pdf', 'ine.pdf');
    const ruta = `/clientes/${clienteId}/documentos/${doc.json.id}/descargar`;

    const propio = await pedir('GET', ruta, asesor);
    expect(propio.status).toBe(200);
    expect(propio.headers.get('content-type')).toContain('application/pdf');
    expect(propio.headers.get('content-disposition')).toContain('ine.pdf');
    expect(Buffer.from(await propio.arrayBuffer()).equals(PDF)).toBe(true);

    expect((await pedir('GET', ruta, otroAsesor)).status).toBe(404);
    expect((await pedir('GET', ruta, auxiliar)).status).toBe(404);
    // El documento de un cliente no se alcanza por la URL de otro cliente propio.
    expect(
      (
        await pedir(
          'GET',
          `/clientes/${otroCliente}/documentos/${doc.json.id}/descargar`,
          otroAsesor,
        )
      ).status,
    ).toBe(404);
    expect((await pedir('GET', ruta, supervisor)).status).toBe(200);
  });

  it('listar y obtener respetan el alcance', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const doc = await subir(clienteId, asesor, 'INE', PDF, 'application/pdf');
    const lista = await pedir('GET', `/clientes/${clienteId}/documentos`, asesor);
    expect((await lista.json()) as Documento[]).toHaveLength(1);
    expect(
      (await pedir('GET', `/clientes/${clienteId}/documentos/${doc.json.id}`, asesor)).status,
    ).toBe(200);
    expect((await pedir('GET', `/clientes/${clienteId}/documentos`, otroAsesor)).status).toBe(404);
  });
});
