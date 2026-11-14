import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  cuerpoCliente,
  crearUsuarioPrueba,
  ID_ESTATUS,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  insertarEtapa,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Flujo HTTP real: AppModule completo (guards, pipes, filtro de errores) contra la base de pruebas.
jest.setTimeout(60_000);

interface Respuesta {
  estatus_id: number;
  avance_porcentaje: number;
  fecha_completada: string | null;
  reactivado_en: string | null;
  motivo_rechazo: string | null;
}

describeConBd('Etapas: cambio de estatus por HTTP (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
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
    return { estado: respuesta.status, json: (texto ? JSON.parse(texto) : {}) as Respuesta };
  }

  async function nueva(estatus: number, avance: number, paso = 2) {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const etapaId = await insertarEtapa(ctx.ds, clienteId, paso, estatus, avance);
    return { clienteId, etapaId, ruta: `/clientes/${clienteId}/etapas/${etapaId}` };
  }

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-23 Bloqueado sin motivo_rechazo responde 400; con motivo, el historial lo guarda', async () => {
    const { ruta, etapaId } = await nueva(ID_ESTATUS['En proceso asesor'], 40);

    const sin = await pedir('PATCH', ruta, t(asesor), { estatus_id: ID_ESTATUS.Bloqueado });
    expect(sin.estado).toBe(400);
    const vacio = await pedir('PATCH', ruta, t(asesor), {
      estatus_id: ID_ESTATUS.Bloqueado,
      motivo_rechazo: '   ',
    });
    expect(vacio.estado).toBe(400);

    const con = await pedir('PATCH', ruta, t(asesor), {
      estatus_id: ID_ESTATUS.Bloqueado,
      motivo_rechazo: 'Error en el acta de nacimiento',
    });
    expect(con.estado).toBe(200);
    expect(con.json).toMatchObject({
      estatus_id: ID_ESTATUS.Bloqueado,
      avance_porcentaje: 40,
      motivo_rechazo: 'Error en el acta de nacimiento',
    });

    const filas = await ctx.ds.query<{ motivo_rechazo: string }[]>(
      'SELECT motivo_rechazo FROM etapas_tramite_historial WHERE etapa_tramite_id = $1',
      [etapaId],
    );
    expect(filas).toEqual([{ motivo_rechazo: 'Error en el acta de nacimiento' }]);
    // El 400 no dejó rastro: solo hay el cambio válido.
  });

  it('avance fuera de 20 a 90 en un estatus En proceso responde 400 y no cambia nada', async () => {
    const { ruta } = await nueva(ID_ESTATUS['Por iniciar'], 10);
    const malo = await pedir('PATCH', ruta, t(asesor), {
      estatus_id: ID_ESTATUS['En proceso cliente'],
      avance_porcentaje: 95,
    });
    expect(malo.estado).toBe(400);
    const igual = await pedir('PATCH', ruta, t(asesor), { estatus_id: 999 });
    expect(igual.estado).toBe(400);
  });

  it('Finalizado llena fecha_completada; salir de Bloqueado llena reactivado_en y parte del avance congelado', async () => {
    const f = await nueva(ID_ESTATUS['En proceso asesor'], 50);
    const fin = await pedir('PATCH', f.ruta, t(asesor), { estatus_id: ID_ESTATUS.Finalizado });
    expect(fin.json.avance_porcentaje).toBe(100);
    expect(fin.json.fecha_completada).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const b = await nueva(ID_ESTATUS['En proceso asesor'], 65, 3);
    await pedir('PATCH', b.ruta, t(asesor), {
      estatus_id: ID_ESTATUS.Bloqueado,
      motivo_rechazo: 'Trámite detenido por el Instituto',
    });
    const reactivada = await pedir('PATCH', b.ruta, t(asesor), {
      estatus_id: ID_ESTATUS['En proceso Instituto'],
    });
    expect(reactivada.estado).toBe(200);
    expect(reactivada.json.avance_porcentaje).toBe(65);
    expect(reactivada.json.reactivado_en).not.toBeNull();
  });

  it('el historial se lista por GET, en orden', async () => {
    const { ruta } = await nueva(ID_ESTATUS['Por iniciar'], 10);
    await pedir('PATCH', ruta, t(asesor), {
      estatus_id: ID_ESTATUS['En proceso cliente'],
      avance_porcentaje: 30,
    });
    await pedir('PATCH', ruta, t(asesor), { estatus_id: ID_ESTATUS.Finalizado });
    const lista = await pedir('GET', `${ruta}/historial`, t(asesor));
    expect(lista.estado).toBe(200);
    const filas = lista.json as unknown as { estatus_nuevo_id: number }[];
    expect(filas.map((x) => x.estatus_nuevo_id)).toEqual([
      ID_ESTATUS['En proceso cliente'],
      ID_ESTATUS.Finalizado,
    ]);
    // Una etapa de otro cliente en la misma URL no se alcanza.
    const otra = await nueva(ID_ESTATUS['Por iniciar'], 10);
    const cruzada = await pedir(
      'GET',
      `/clientes/${otra.clienteId}/etapas/${ruta.split('/').pop()}/historial`,
      t(asesor),
    );
    expect(cruzada.estado).toBe(404);
  });

  it('GET etapas lista las 16 etapas en orden con su nombre y el avance global; el ajeno recibe 404', async () => {
    const creado = await fetch(`${ctx.base}/clientes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t(asesor)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpoCliente(catalogo)),
    });
    const { id: clienteId } = (await creado.json()) as { id: string };
    const ruta = `/clientes/${clienteId}/etapas`;

    const lista = await pedir('GET', ruta, t(asesor));
    expect(lista.estado).toBe(200);
    const cuerpo = lista.json as unknown as {
      avance_global: number;
      etapas: { numero_paso: number; nombre: string; estatus_id: number }[];
    };
    expect(cuerpo.etapas.map((e) => e.numero_paso)).toEqual(
      Array.from({ length: 16 }, (_, i) => i),
    );
    expect(cuerpo.etapas[0].nombre).toBe('Diagnóstico inicial');
    expect(cuerpo.avance_global).toBe(10);

    // El asesor marca a mano: la etapa 0 Finalizada (100) y la 1 No aplica (fuera del global).
    const id = (paso: number) =>
      cuerpo.etapas.find((e) => e.numero_paso === paso) as never as { id: string };
    await pedir('PATCH', `${ruta}/${id(0).id}`, t(asesor), { estatus_id: ID_ESTATUS.Finalizado });
    await pedir('PATCH', `${ruta}/${id(1).id}`, t(asesor), { estatus_id: ID_ESTATUS['No aplica'] });
    const despues = (await pedir('GET', ruta, t(asesor))).json as unknown as {
      avance_global: number;
    };
    // (100 + 14 etapas de 10) / 15 = 16
    expect(despues.avance_global).toBe(16);

    expect((await pedir('GET', ruta, t(otroAsesor))).estado).toBe(404);
  });

  it('CP-28 asesor ajeno recibe 404; auxiliar recibe 403 al escribir etapas', async () => {
    const { clienteId, ruta } = await nueva(ID_ESTATUS['Por iniciar'], 10);
    const cuerpo = { estatus_id: ID_ESTATUS['En proceso asesor'], avance_porcentaje: 30 };

    expect((await pedir('PATCH', ruta, t(otroAsesor), cuerpo)).estado).toBe(404);

    await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);
    expect((await pedir('PATCH', ruta, t(auxiliar), cuerpo)).estado).toBe(403);

    // El propietario sí puede, y el rechazo anterior no cambió nada.
    expect((await pedir('PATCH', ruta, t(asesor), cuerpo)).estado).toBe(200);
  });
});
