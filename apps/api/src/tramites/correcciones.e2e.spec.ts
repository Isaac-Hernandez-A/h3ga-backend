import { randomUUID } from 'node:crypto';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  curpFicticia,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { textoDePdf } from '../common/testing/texto-de-pdf';
import { tokenDe } from '../common/testing/tokens';

// Correcciones F2 del paso 4 del Diagnóstico inicial (CP-101 a CP-111): aplicación real y base de pruebas.
jest.setTimeout(90_000);

const TIPOS_ESPERADOS = [
  'Corrección de CURP',
  'Corrección de RFC',
  'Corrección de Acta de Nacimiento',
  'Corrección de Nombre y/o Apellidos',
  'Corrección de Fecha o Lugar de Nacimiento',
  'Corrección de Sexo / Género',
  'Unificación de NSS (Duplicidad / Multiplicidad)',
  'Corrección de Datos en AFORE',
  'Regularización / Actualización de Datos ante IMSS (SINDO)',
  'Corrección de Domicilio',
  'Corrección de Clave de Elector (INE)',
  'Otro',
];

interface Correccion {
  id: string;
  cliente_id: string;
  tipo_correccion_id: number;
  observaciones: string | null;
  tiempo_promedio: string | null;
  dato_actual: string | null;
  dato_correcto: string | null;
}

describeConBd('Correcciones del cliente (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const tipos = new Map<string, number>();
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

  // `crudo` permite mandar texto que no es JSON válido.
  async function pedir(
    metodo: string,
    ruta: string,
    token?: string,
    cuerpo?: unknown,
    crudo?: string,
  ) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cuerpo !== undefined || crudo !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      body: crudo ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
    });
    const texto = await respuesta.text();
    return {
      estado: respuesta.status,
      respuesta,
      // Solo las respuestas JSON se interpretan (el PDF del F0 no lo es).
      json: (texto && respuesta.headers.get('content-type')?.includes('json')
        ? JSON.parse(texto)
        : null) as never,
    };
  }
  const nuevoCliente = () => insertarCliente(ctx.ds, catalogo, asesor.id);
  const crear = async (
    clienteId: string,
    tipo: string,
    extra: object = {},
  ): Promise<Correccion> => {
    const r = await pedir('POST', `/clientes/${clienteId}/correcciones`, t(asesor), {
      tipo_correccion_id: tipos.get(tipo),
      ...extra,
    });
    expect(r.estado).toBe(201);
    return r.json as Correccion;
  };
  const rutaDe = (clienteId: string, id?: string) =>
    `/clientes/${clienteId}/correcciones${id ? `/${id}` : ''}`;
  const enBase = async (id: string) =>
    (await ctx.ds.query<Correccion[]>('SELECT * FROM correcciones_cliente WHERE id = $1', [id]))[0];

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    for (const fila of await ctx.ds.query<{ id: number; nombre: string }[]>(
      'SELECT id, nombre FROM tipo_correccion',
    )) {
      tipos.set(fila.nombre, fila.id);
    }
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-101 GET /catalogos/tipos-correccion devuelve los 12 tipos ordenados por id para asesor, auxiliar y supervisor; sin token 401', async () => {
    for (const quien of [asesor, auxiliar, supervisor]) {
      const r = await pedir('GET', '/catalogos/tipos-correccion', t(quien));
      expect(r.estado).toBe(200);
      const lista = r.json as { id: number; nombre: string }[];
      expect(lista).toHaveLength(12);
      expect(lista.map((x) => x.nombre)).toEqual(TIPOS_ESPERADOS);
      expect(lista.map((x) => x.id)).toEqual([...lista.map((x) => x.id)].sort((a, b) => a - b));
    }
    expect((await pedir('GET', '/catalogos/tipos-correccion')).estado).toBe(401);
  });

  it('CP-102 un cliente sin correcciones responde 200 con []', async () => {
    const r = await pedir('GET', rutaDe(await nuevoCliente()), t(asesor));
    expect(r.estado).toBe(200);
    expect(r.json).toEqual([]);
  });

  it('CP-103 la lista trae las correcciones del cliente en el orden de inserción (el mismo del PDF, ORDER BY ctid) y no las de otro cliente', async () => {
    const clienteId = await nuevoCliente();
    const otro = await nuevoCliente();
    await crear(otro, 'Otro', { observaciones: 'de otro cliente' });
    const a = await crear(clienteId, 'Corrección de Acta de Nacimiento', {
      observaciones: 'primera',
    });
    const b = await crear(clienteId, 'Otro', { observaciones: 'segunda' });
    const c = await crear(clienteId, 'Corrección de Domicilio', { observaciones: 'tercera' });

    const r = await pedir('GET', rutaDe(clienteId), t(asesor));
    expect(r.estado).toBe(200);
    const lista = r.json as Correccion[];
    expect(lista.map((x) => x.id)).toEqual([a.id, b.id, c.id]);
    expect(lista.every((x) => x.cliente_id === clienteId)).toBe(true);
    expect(lista[0]).toEqual(a);

    const criterioPdf = await ctx.ds.query<{ id: string }[]>(
      'SELECT id FROM correcciones_cliente WHERE cliente_id = $1 ORDER BY ctid',
      [clienteId],
    );
    expect(lista.map((x) => x.id)).toEqual(criterioPdf.map((x) => x.id));
  });

  it('CP-104 GET de una corrección: 200 con sus campos; inexistente o de otro cliente 404; id que no es uuid 400', async () => {
    const clienteId = await nuevoCliente();
    const otro = await nuevoCliente();
    const c = await crear(clienteId, 'Corrección de Acta de Nacimiento', {
      observaciones: 'Acta con error',
      tiempo_promedio: '15 días hábiles',
      dato_actual: 'Juan',
    });
    const ajena = await crear(otro, 'Otro');

    const r = await pedir('GET', rutaDe(clienteId, c.id), t(asesor));
    expect(r.estado).toBe(200);
    expect(r.json).toEqual(c);
    expect(r.json).toMatchObject({
      observaciones: 'Acta con error',
      tiempo_promedio: '15 días hábiles',
      dato_actual: 'Juan',
      dato_correcto: null,
    });
    expect((await pedir('GET', rutaDe(clienteId, randomUUID()), t(asesor))).estado).toBe(404);
    expect((await pedir('GET', rutaDe(clienteId, ajena.id), t(asesor))).estado).toBe(404);
    expect((await pedir('GET', rutaDe(clienteId, 'no-es-uuid'), t(asesor))).estado).toBe(400);
  });

  it('CP-105 PATCH parcial: cambia solo lo enviado, devuelve la corrección actualizada y no toca el tipo ni el cliente', async () => {
    const clienteId = await nuevoCliente();
    const c = await crear(clienteId, 'Corrección de Acta de Nacimiento', {
      observaciones: 'original',
      tiempo_promedio: '15 días hábiles',
      dato_actual: 'Juan',
    });
    const r = await pedir('PATCH', rutaDe(clienteId, c.id), t(asesor), {
      observaciones: 'revisada',
      dato_correcto: '  Juan Pérez  ',
    });
    expect(r.estado).toBe(200);
    expect(r.json).toEqual({
      ...c,
      observaciones: 'revisada',
      dato_correcto: 'Juan Pérez',
    });
    expect(await enBase(c.id)).toEqual(r.json);
    // Lo no enviado se conserva.
    expect((r.json as Correccion).tiempo_promedio).toBe('15 días hábiles');
    expect((r.json as Correccion).dato_actual).toBe('Juan');
  });

  it('CP-105 PATCH con cuerpo {} responde 200 y deja la corrección igual', async () => {
    const clienteId = await nuevoCliente();
    const c = await crear(clienteId, 'Otro', { observaciones: 'sin cambios' });
    const r = await pedir('PATCH', rutaDe(clienteId, c.id), t(asesor), {});
    expect(r.estado).toBe(200);
    expect(r.json).toEqual(c);
  });

  it('CP-106 PATCH que borra una observación (null) y el tiempo promedio; el resto queda', async () => {
    const clienteId = await nuevoCliente();
    const c = await crear(clienteId, 'Corrección de Domicilio', {
      observaciones: 'a borrar',
      tiempo_promedio: '1 mes',
      dato_actual: 'Calle 1',
    });
    const r = await pedir('PATCH', rutaDe(clienteId, c.id), t(asesor), {
      observaciones: null,
      tiempo_promedio: null,
    });
    expect(r.estado).toBe(200);
    expect(r.json).toMatchObject({
      observaciones: null,
      tiempo_promedio: null,
      dato_actual: 'Calle 1',
    });
    expect(await enBase(c.id)).toMatchObject({ observaciones: null, tiempo_promedio: null });
  });

  it('CP-107 PATCH en un tipo que exige dato_correcto: no se puede borrar ni dejar con formato inválido, y el registro queda intacto', async () => {
    const clienteId = await nuevoCliente();
    const curp = curpFicticia();
    const c = await crear(clienteId, 'Corrección de CURP', {
      dato_actual: 'ABCD000000HXXXXX00',
      dato_correcto: curp,
      observaciones: 'original',
    });
    const ruta = rutaDe(clienteId, c.id);

    for (const cuerpo of [
      { dato_correcto: null },
      { dato_correcto: '' },
      { dato_correcto: '   ' },
      { dato_correcto: 'no-es-una-curp' },
    ]) {
      const r = await pedir('PATCH', ruta, t(asesor), cuerpo);
      expect({ cuerpo, estado: r.estado }).toEqual({ cuerpo, estado: 400 });
    }
    expect(await enBase(c.id)).toEqual(c);

    // Un cambio que no toca dato_correcto sigue siendo válido, y uno válido de dato_correcto también.
    expect((await pedir('PATCH', ruta, t(asesor), { observaciones: 'nueva' })).json).toMatchObject({
      dato_correcto: curp,
      observaciones: 'nueva',
    });
    const otraCurp = curpFicticia();
    expect((await pedir('PATCH', ruta, t(asesor), { dato_correcto: otraCurp })).json).toMatchObject(
      { dato_correcto: otraCurp },
    );

    // En un tipo que no modifica el expediente, dato_correcto sí puede quedar vacío.
    const libre = await crear(clienteId, 'Otro', { dato_correcto: 'algo' });
    const limpio = await pedir('PATCH', rutaDe(clienteId, libre.id), t(asesor), {
      dato_correcto: null,
    });
    expect(limpio.estado).toBe(200);
    expect(limpio.json).toMatchObject({ dato_correcto: null });
  });

  it('CP-108 PATCH inválido responde 400: tipo_correccion_id y otros campos fuera del contrato, valores que no son texto y JSON roto', async () => {
    const clienteId = await nuevoCliente();
    const c = await crear(clienteId, 'Otro', { observaciones: 'original' });
    const ruta = rutaDe(clienteId, c.id);
    const invalidos: [string, unknown, string?][] = [
      ['tipo_correccion_id', { tipo_correccion_id: tipos.get('Corrección de CURP') }],
      ['cliente_id', { cliente_id: randomUUID() }],
      ['id', { id: randomUUID() }],
      ['campo desconocido', { otro: 'x' }],
      ['observaciones numérica', { observaciones: 5 }],
      ['tiempo_promedio objeto', { tiempo_promedio: {} }],
      ['dato_actual lista', { dato_actual: ['a'] }],
      ['JSON roto', undefined, '{"observaciones":'],
      ['cuerpo que no es objeto', undefined, '"texto"'],
    ];
    for (const [caso, cuerpo, crudo] of invalidos) {
      const r = await pedir('PATCH', ruta, t(asesor), cuerpo, crudo);
      expect({ caso, estado: r.estado }).toEqual({ caso, estado: 400 });
    }
    expect(await enBase(c.id)).toEqual(c);
  });

  it('CP-109 roles: asesor dueño 200; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404', async () => {
    const clienteId = await nuevoCliente();
    await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);
    const c = await crear(clienteId, 'Otro', { observaciones: 'original' });
    const accesos: [string, string, object?][] = [
      ['GET', rutaDe(clienteId)],
      ['GET', rutaDe(clienteId, c.id)],
      ['PATCH', rutaDe(clienteId, c.id), { observaciones: 'x' }],
    ];
    for (const [metodo, ruta, cuerpo] of accesos) {
      const caso = `${metodo} ${ruta}`;
      const estados = {
        caso,
        dueno: (await pedir(metodo, ruta, t(asesor), cuerpo)).estado,
        supervisor: (await pedir(metodo, ruta, t(supervisor), cuerpo)).estado,
        auxiliar: (await pedir(metodo, ruta, t(auxiliar), cuerpo)).estado,
        sinToken: (await pedir(metodo, ruta, undefined, cuerpo)).estado,
        ajeno: (await pedir(metodo, ruta, t(otroAsesor), cuerpo)).estado,
      };
      expect(estados).toEqual({
        caso,
        dueno: 200,
        supervisor: 403,
        auxiliar: 403,
        sinToken: 401,
        ajeno: 404,
      });
    }
    const inexistente = randomUUID();
    expect((await pedir('GET', rutaDe(inexistente), t(asesor))).estado).toBe(404);
    expect((await pedir('GET', rutaDe(inexistente, c.id), t(asesor))).estado).toBe(404);
    expect(
      (await pedir('PATCH', rutaDe(inexistente, c.id), t(asesor), { observaciones: 'x' })).estado,
    ).toBe(404);
    // Los rechazos no modificaron nada: la última edición válida fue la del asesor dueño.
    expect((await enBase(c.id)).observaciones).toBe('x');
  });

  it('CP-110 el PDF del F0 sigue respondiendo 200 después de crear y modificar correcciones, y muestra lo modificado', async () => {
    const clienteId = await nuevoCliente();
    const rutaPdf = `/clientes/${clienteId}/diagnostico-inicial/pdf`;
    const c = await crear(clienteId, 'Corrección de Acta de Nacimiento', {
      observaciones: 'Observación inicial',
      tiempo_promedio: '15 días hábiles',
    });
    const antes = await pedir('GET', rutaPdf, t(asesor));
    expect(antes.estado).toBe(200);

    const cambio = await pedir('PATCH', rutaDe(clienteId, c.id), t(asesor), {
      observaciones: 'Observación corregida por el asesor',
    });
    expect(cambio.estado).toBe(200);
    const despues = await fetch(`${ctx.base}${rutaPdf}`, {
      headers: { Authorization: `Bearer ${t(asesor)}` },
    });
    expect(despues.status).toBe(200);
    expect(despues.headers.get('content-type')).toContain('application/pdf');
    const pdf = Buffer.from(await despues.arrayBuffer());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const texto = (await textoDePdf(pdf)).replace(/\s+/g, ' ');
    expect(texto).toContain('Observación corregida por el asesor');
    expect(texto).not.toContain('Observación inicial');
  });

  it('CP-111 ninguna entrada responde 500 en las rutas de correcciones', async () => {
    const clienteId = await nuevoCliente();
    const c = await crear(clienteId, 'Otro');
    const resultados: { caso: string; estado: number }[] = [];
    const registrar = async (caso: string, r: Promise<{ estado: number }>) =>
      resultados.push({ caso, estado: (await r).estado });

    for (const crudo of ['', '{', 'null', '[]', '"texto"', '123']) {
      await registrar(
        `PATCH crudo ${crudo}`,
        pedir('PATCH', rutaDe(clienteId, c.id), t(asesor), undefined, crudo),
      );
    }
    for (const cuerpo of [
      { observaciones: 'x'.repeat(200_000) },
      { dato_correcto: 'ñ'.repeat(5000) },
      { observaciones: '\u0000' },
      { dato_actual: null, dato_correcto: null, tiempo_promedio: null, observaciones: null },
    ]) {
      await registrar(
        `PATCH ${JSON.stringify(cuerpo).slice(0, 30)}`,
        pedir('PATCH', rutaDe(clienteId, c.id), t(asesor), cuerpo),
      );
    }
    // Un carácter NUL no se puede guardar en texto de PostgreSQL: 400, no 500 (también al crear).
    await registrar(
      'POST con NUL',
      pedir('POST', rutaDe(clienteId), t(asesor), {
        tipo_correccion_id: tipos.get('Otro'),
        observaciones: 'a b',
      }),
    );
    for (const id of ['no-es-uuid', randomUUID(), '0', '%00']) {
      await registrar(`GET ${id}`, pedir('GET', rutaDe(clienteId, id), t(asesor)));
      await registrar(`PATCH ${id}`, pedir('PATCH', rutaDe(clienteId, id), t(asesor), {}));
    }
    for (const { caso, estado } of resultados) {
      expect({ caso, quinientos: estado >= 500 }).toEqual({ caso, quinientos: false });
    }
  });
});
