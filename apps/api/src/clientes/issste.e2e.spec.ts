import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
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

// PUT /clientes/:clienteId/historial-laboral/issste (CP-93 a CP-100): aplicación real y base de pruebas.
jest.setTimeout(60_000);

const MENSAJE_SIN_HISTORIAL = 'Primero registra el historial laboral del cliente.';
const HISTORIAL = {
  semanas_issste: 120,
  salario_promedio: 15234.5,
  ultimo_patron: 'Patrón Ficticio S.A. de C.V.',
  vigencia_derechos: 'si',
};
const ISSSTE = {
  nss_issste: '12345678901',
  regimen_pensionario: 'Décimo transitorio',
  anios_laborados: 18.5,
};

interface Issste {
  id: string;
  historial_laboral_id: string;
  nss_issste: string;
  regimen_pensionario: string;
  anios_laborados: number | null;
  activo: boolean;
}

describeConBd('PUT de la información ISSSTE (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);
  const ruta = (clienteId: string) => `/clientes/${clienteId}/historial-laboral/issste`;

  // `cuerpo` se serializa a JSON; `crudo` permite mandar texto que no es JSON válido.
  async function pedir(
    metodo: string,
    url: string,
    token?: string,
    cuerpo?: unknown,
    crudo?: string,
  ) {
    const respuesta = await fetch(`${ctx.base}${url}`, {
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
      texto,
      json: (texto && texto !== 'null' ? JSON.parse(texto) : null) as never,
    };
  }
  const guardar = (clienteId: string, cuerpo: unknown, token = t(asesor)) =>
    pedir('PUT', ruta(clienteId), token, cuerpo);
  const filas = (clienteId: string) =>
    ctx.ds.query<Issste[]>(
      `SELECT i.* FROM informacion_issste i JOIN historial_laboral h ON h.id = i.historial_laboral_id
        WHERE h.cliente_id = $1`,
      [clienteId],
    );

  // Cliente del asesor, con o sin historial laboral.
  async function cliente(conHistorial = true): Promise<string> {
    const id = await insertarCliente(ctx.ds, catalogo, asesor.id);
    if (conHistorial) {
      const r = await pedir('PUT', `/clientes/${id}/historial-laboral`, t(asesor), HISTORIAL);
      expect(r.estado).toBe(200);
    }
    return id;
  }

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-93 crear: el asesor dueño guarda la información ISSSTE (200); sin id ni activo se genera el id y activo es true; anios_laborados vuelve como número', async () => {
    const clienteId = await cliente();
    const r = await guardar(clienteId, ISSSTE);
    expect(r.estado).toBe(200);
    expect(r.json).toMatchObject({ ...ISSSTE, activo: true });
    const guardado = r.json as Issste;
    expect(guardado.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof guardado.anios_laborados).toBe('number');
    const historial = (await pedir('GET', `/clientes/${clienteId}/historial-laboral`, t(asesor)))
      .json as { id: string };
    expect(guardado.historial_laboral_id).toBe(historial.id);
    expect(await filas(clienteId)).toHaveLength(1);
  });

  it('CP-93 el id enviado se usa al crear; activo y anios_laborados son opcionales (anios queda en null)', async () => {
    const clienteId = await cliente();
    const id = randomUUID();
    const r = await guardar(clienteId, {
      id,
      nss_issste: '98765432100',
      regimen_pensionario: 'Cuenta individual',
      activo: false,
    });
    expect(r.estado).toBe(200);
    expect(r.json).toMatchObject({ id, activo: false, anios_laborados: null });
  });

  it('CP-94 reemplazar: dos PUT dejan una sola fila con el mismo id, y el segundo reemplaza los datos', async () => {
    const clienteId = await cliente();
    const primero = (await guardar(clienteId, ISSSTE)).json as Issste;
    const igual = (await guardar(clienteId, ISSSTE)).json as Issste;
    expect(igual.id).toBe(primero.id);
    expect(await filas(clienteId)).toHaveLength(1);

    // El id enviado en un reemplazo se ignora: se conserva el de la fila existente. Lo omitido se limpia.
    const cambio = await guardar(clienteId, {
      id: randomUUID(),
      nss_issste: '55555555555',
      regimen_pensionario: 'Otro régimen',
      activo: false,
    });
    expect(cambio.estado).toBe(200);
    expect(cambio.json).toMatchObject({
      id: primero.id,
      nss_issste: '55555555555',
      regimen_pensionario: 'Otro régimen',
      anios_laborados: null,
      activo: false,
    });
    const enBase = await filas(clienteId);
    expect(enBase).toHaveLength(1);
    expect(enBase[0].id).toBe(primero.id);
  });

  it('CP-94 PUT simultáneos del mismo cliente no duplican la fila', async () => {
    const clienteId = await cliente();
    const respuestas = await Promise.all(
      Array.from({ length: 5 }, () => guardar(clienteId, ISSSTE)),
    );
    for (const r of respuestas) expect(r.estado).toBe(200);
    expect(new Set(respuestas.map((r) => (r.json as Issste).id)).size).toBe(1);
    expect(await filas(clienteId)).toHaveLength(1);
  });

  it('CP-94 un id que ya pertenece a otro cliente responde 409 en español, no 500', async () => {
    const primero = await cliente();
    const ajeno = (await guardar(primero, ISSSTE)).json as Issste;
    const segundo = await cliente();
    const r = await guardar(segundo, { ...ISSSTE, id: ajeno.id });
    expect(r.estado).toBe(409);
    expect((r.json as { message: string }).message).toBe(
      'El id enviado ya pertenece a otra información ISSSTE.',
    );
    expect(await filas(segundo)).toHaveLength(0);
  });

  it('CP-95 sin historial laboral responde 409 con "Primero registra el historial laboral del cliente." y no guarda nada', async () => {
    const clienteId = await cliente(false);
    const r = await guardar(clienteId, ISSSTE);
    expect(r.estado).toBe(409);
    expect((r.json as { message: string }).message).toBe(MENSAJE_SIN_HISTORIAL);
    expect(await filas(clienteId)).toHaveLength(0);
  });

  it('CP-96 GET después del PUT devuelve lo guardado, para el asesor dueño y para el supervisor', async () => {
    const clienteId = await cliente();
    const guardado = (await guardar(clienteId, ISSSTE)).json as Issste;
    for (const quien of [asesor, supervisor]) {
      const r = await pedir('GET', ruta(clienteId), t(quien));
      expect(r.estado).toBe(200);
      expect(r.json).toEqual(guardado);
      expect(typeof (r.json as Issste).anios_laborados).toBe('number');
    }
  });

  it('CP-97 validaciones: sin nss, nss de 21 caracteres, años negativos, 1000 o con 3 decimales responden 400 y no guardan', async () => {
    const clienteId = await cliente();
    const base = { nss_issste: '12345678901', regimen_pensionario: 'Régimen', anios_laborados: 10 };
    const invalidos: [string, unknown][] = [
      ['cuerpo vacío', {}],
      ['sin nss_issste', { regimen_pensionario: 'Régimen' }],
      ['nss_issste vacío', { ...base, nss_issste: '' }],
      ['nss_issste de 21 caracteres', { ...base, nss_issste: '1'.repeat(21) }],
      ['nss_issste no es texto', { ...base, nss_issste: 12345678901 }],
      ['sin regimen_pensionario', { nss_issste: '12345678901' }],
      ['regimen_pensionario vacío', { ...base, regimen_pensionario: '' }],
      ['anios_laborados negativo', { ...base, anios_laborados: -1 }],
      ['anios_laborados 1000', { ...base, anios_laborados: 1000 }],
      ['anios_laborados 999.991', { ...base, anios_laborados: 999.991 }],
      ['anios_laborados con 3 decimales', { ...base, anios_laborados: 1.234 }],
      ['anios_laborados es texto', { ...base, anios_laborados: '12' }],
      ['anios_laborados enorme', { ...base, anios_laborados: 1e21 }],
      ['id no es uuid', { ...base, id: 'no-es-uuid' }],
      ['activo no es booleano', { ...base, activo: 'si' }],
      ['campo desconocido', { ...base, historial_laboral_id: randomUUID() }],
    ];
    for (const [caso, cuerpo] of invalidos) {
      const r = await guardar(clienteId, cuerpo);
      expect({ caso, estado: r.estado }).toEqual({ caso, estado: 400 });
    }
    expect(await filas(clienteId)).toHaveLength(0);
  });

  it('CP-97 los límites válidos se aceptan: nss de 20 caracteres, años 0 y 999.99', async () => {
    const clienteId = await cliente();
    const nss = '1'.repeat(20);
    const base = { regimen_pensionario: 'Régimen' };
    expect((await guardar(clienteId, { ...base, nss_issste: nss })).estado).toBe(200);
    const cero = await guardar(clienteId, { ...base, nss_issste: nss, anios_laborados: 0 });
    expect(cero.estado).toBe(200);
    expect((cero.json as Issste).anios_laborados).toBe(0);
    const maximo = await guardar(clienteId, { ...base, nss_issste: nss, anios_laborados: 999.99 });
    expect(maximo.estado).toBe(200);
    expect((maximo.json as Issste).anios_laborados).toBe(999.99);
  });

  it('CP-98 roles: asesor ajeno 404, cliente inexistente 404, supervisor 403, auxiliar 403 (aun autorizado), sin token 401', async () => {
    const clienteId = await cliente();
    await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);

    expect((await guardar(clienteId, ISSSTE, t(otroAsesor))).estado).toBe(404);
    expect((await guardar(randomUUID(), ISSSTE)).estado).toBe(404);
    expect((await guardar(clienteId, ISSSTE, t(supervisor))).estado).toBe(403);
    expect((await guardar(clienteId, ISSSTE, t(auxiliar))).estado).toBe(403);
    expect((await pedir('PUT', ruta(clienteId), undefined, ISSSTE)).estado).toBe(401);
    expect((await pedir('PUT', ruta(clienteId), tokenDe('rol-inventado'), ISSSTE)).estado).toBe(
      401,
    );
    // Ninguno de los rechazos guardó nada.
    expect(await filas(clienteId)).toHaveLength(0);
  });

  it('CP-99 ninguna entrada responde 500: cuerpos que no son objeto, JSON roto y valores extremos dan 4xx', async () => {
    const clienteId = await cliente();
    const crudos = ['', '{', 'null', '[]', '"texto"', '123', '{"anios_laborados":}'];
    const resultados: { caso: string; estado: number }[] = [];
    for (const crudo of crudos) {
      const r = await pedir('PUT', ruta(clienteId), t(asesor), undefined, crudo);
      resultados.push({ caso: crudo, estado: r.estado });
    }
    for (const cuerpo of [
      { nss_issste: 'x'.repeat(5000), regimen_pensionario: 'r' },
      { nss_issste: '1', regimen_pensionario: 'r'.repeat(100_000) },
      { nss_issste: '1', regimen_pensionario: 'r', anios_laborados: 1e308 },
      { nss_issste: '1', regimen_pensionario: 'r', anios_laborados: null },
      { nss_issste: '1', regimen_pensionario: 'r', activo: null },
    ]) {
      const r = await guardar(clienteId, cuerpo);
      resultados.push({ caso: JSON.stringify(cuerpo).slice(0, 40), estado: r.estado });
    }
    for (const { caso, estado } of resultados) {
      expect({ caso, quinientos: estado >= 500 }).toEqual({ caso, quinientos: false });
    }
  });

  it('CP-100 Swagger describe anios_laborados como número (nullable) y id y activo como opcionales en el cuerpo del PUT', () => {
    const documento = SwaggerModule.createDocument(ctx.app, new DocumentBuilder().build());
    const esquemas = documento.components?.schemas as Record<
      string,
      { properties: Record<string, { type?: string; nullable?: boolean }>; required?: string[] }
    >;
    const respuesta = esquemas['InformacionIssste'];
    expect(respuesta.properties['anios_laborados'].type).toBe('number');
    expect(respuesta.properties['anios_laborados'].nullable).toBe(true);

    const cuerpo = esquemas['CreateInformacionIsssteDto'];
    expect(cuerpo.properties['anios_laborados'].type).toBe('number');
    expect(cuerpo.required).toEqual(expect.arrayContaining(['nss_issste', 'regimen_pensionario']));
    expect(cuerpo.required).not.toContain('id');
    expect(cuerpo.required).not.toContain('activo');
    expect(cuerpo.required).not.toContain('anios_laborados');
  });
});
