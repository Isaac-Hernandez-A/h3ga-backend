import { randomUUID } from 'node:crypto';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  insertarEvento,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Flujo HTTP real (AppModule completo) de la agenda contra la base de pruebas.
jest.setTimeout(60_000);

interface Evento {
  id: string;
  asesor_id: string;
  cliente_id: string;
  fecha: string;
  estatus: string;
}

describeConBd('Agenda (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

  async function pedir(metodo: string, ruta: string, token?: string, datos?: object) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(datos ? { 'Content-Type': 'application/json' } : {}),
      },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, json: (texto ? JSON.parse(texto) : {}) as never };
  }
  const cuerpo = (clienteId: string, extra: object = {}) => ({
    cliente_id: clienteId,
    fecha: '2026-12-01',
    hora: '10:30',
    motivo: 'Revisión de expediente (ficticio)',
    estatus: 'pendiente',
    ...extra,
  });
  const ids = (r: { json: unknown }) => (r.json as Evento[]).map((e) => e.id).sort();

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

  it('CP-36 el asesor agenda para su cliente; para uno ajeno 404; estatus fuera de pendiente, cumplido, reagendado o cancelado responde 400', async () => {
    const propio = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const ajeno = await insertarCliente(ctx.ds, catalogo, otroAsesor.id);

    const ok = await pedir('POST', '/agenda', t(asesor), cuerpo(propio));
    expect(ok.estado).toBe(201);
    // asesor_id sale del token: el enviado se ignora.
    const forzado = await pedir(
      'POST',
      '/agenda',
      t(asesor),
      cuerpo(propio, { asesor_id: otroAsesor.id }),
    );
    expect(forzado.estado).toBe(201);
    expect((forzado.json as Evento).asesor_id).toBe(asesor.id);

    expect((await pedir('POST', '/agenda', t(asesor), cuerpo(ajeno))).estado).toBe(404);
    expect(
      (await pedir('POST', '/agenda', t(asesor), cuerpo(propio, { estatus: 'archivado' }))).estado,
    ).toBe(400);
    expect(
      (await pedir('POST', '/agenda', t(asesor), cuerpo(propio, { fecha: '2026-02-30' }))).estado,
    ).toBe(400);
    for (const estatus of ['pendiente', 'cumplido', 'reagendado', 'cancelado']) {
      expect((await pedir('POST', '/agenda', t(asesor), cuerpo(propio, { estatus }))).estado).toBe(
        201,
      );
    }
    // El auxiliar no agenda (solo consulta).
    await autorizarEnBd(ctx.ds, propio, auxiliar.id, asesor.id, true);
    expect((await pedir('POST', '/agenda', t(auxiliar), cuerpo(propio))).estado).toBe(403);
  });

  it('CP-37 el asesor ve la suya, el auxiliar la de clientes autorizados, el supervisor toda; filtra por fecha', async () => {
    // Usuarios propios de esta prueba: las demás pruebas del archivo ya dejaron eventos del asesor común.
    const uA = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const uB = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const uX = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    const uS = supervisor;
    const deA = await insertarCliente(ctx.ds, catalogo, uA.id);
    const deB = await insertarCliente(ctx.ds, catalogo, uB.id);
    const a1 = await insertarEvento(ctx.ds, deA, uA.id, '2026-12-05');
    const a2 = await insertarEvento(ctx.ds, deA, uA.id, '2026-12-06', 'cumplido');
    const b1 = await insertarEvento(ctx.ds, deB, uB.id, '2026-12-05');
    await autorizarEnBd(ctx.ds, deB, uX.id, uB.id, true);

    expect(ids(await pedir('GET', '/agenda', t(uA)))).toEqual([a1, a2].sort());
    expect(ids(await pedir('GET', '/agenda', t(uB)))).toEqual([b1]);
    expect(ids(await pedir('GET', '/agenda', t(uX)))).toEqual([b1]);
    expect(ids(await pedir('GET', '/agenda', t(uS)))).toEqual(expect.arrayContaining([a1, a2, b1]));

    expect(ids(await pedir('GET', '/agenda?fecha=2026-12-05', t(uA)))).toEqual([a1]);
    expect(ids(await pedir('GET', '/agenda?fecha=2026-12-05', t(uS)))).toEqual(
      expect.arrayContaining([a1, b1]),
    );
    expect(ids(await pedir('GET', '/agenda?estatus=cumplido', t(uA)))).toEqual([a2]);
    expect((await pedir('GET', '/agenda?estatus=otro', t(uA))).estado).toBe(400);
  });

  it('obtener y reagendar por id respetan el alcance (404 fuera de él)', async () => {
    const deA = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const evento = await insertarEvento(ctx.ds, deA, asesor.id, '2026-12-10');

    expect((await pedir('GET', `/agenda/${evento}`, t(asesor))).estado).toBe(200);
    expect((await pedir('GET', `/agenda/${evento}`, t(otroAsesor))).estado).toBe(404);
    expect((await pedir('GET', `/agenda/${randomUUID()}`, t(asesor))).estado).toBe(404);

    const reagendado = await pedir('PATCH', `/agenda/${evento}`, t(asesor), {
      fecha: '2026-12-15',
      estatus: 'reagendado',
    });
    expect(reagendado.estado).toBe(200);
    expect(reagendado.json).toMatchObject({
      id: evento,
      fecha: '2026-12-15',
      estatus: 'reagendado',
    });
    expect(
      (await pedir('PATCH', `/agenda/${evento}`, t(otroAsesor), { fecha: '2026-12-20' })).estado,
    ).toBe(404);
    // No se puede mover el evento a un cliente ajeno.
    const ajeno = await insertarCliente(ctx.ds, catalogo, otroAsesor.id);
    expect(
      (await pedir('PATCH', `/agenda/${evento}`, t(asesor), { cliente_id: ajeno })).estado,
    ).toBe(404);
    // asesor_id no se modifica por PATCH.
    expect(
      (await pedir('PATCH', `/agenda/${evento}`, t(asesor), { asesor_id: otroAsesor.id })).estado,
    ).toBe(400);
  });
});
