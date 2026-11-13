import { randomUUID } from 'node:crypto';
import { Reloj } from '../common/fechas';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  ID_ESTATUS,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  insertarEtapa,
  insertarEvento,
  fijarCompromiso,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';
import { AvisosModule } from './avisos.module';

// Citas reagendadas y reapertura de avisos atendidos (aplicación real y base de pruebas, hora fijada por el
// Reloj). Una cita 'reagendado' sigue siendo un compromiso por cumplir; mover un compromiso a un día cuya
// alerta ya existía y estaba atendida la deja pendiente otra vez. Solo datos ficticios.
jest.setTimeout(120_000);

interface Aviso {
  id: string;
  tipo: string;
  etapa_tramite_id: string | null;
  evento_id: string | null;
  fecha_alerta: string;
  atendido: boolean;
  atendido_por: string | null;
  fecha_atencion: string | null;
}
interface FilaAviso {
  fecha_alerta: Date;
  atendido: boolean;
  atendido_por: string | null;
  fecha_atencion: Date | null;
}

const enCancun = (fechaHora: string) => new Date(`${fechaHora}-05:00`);

describeConBd('Avisos: citas reagendadas y reapertura (aplicación real)', () => {
  let ctx: AppConBd;
  let reloj: Reloj;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);
  const fijarHora = (fechaHora: string) =>
    jest.spyOn(reloj, 'ahora').mockReturnValue(enCancun(fechaHora));

  async function pedir(metodo: string, ruta: string, token: string, datos?: object) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(datos ? { 'Content-Type': 'application/json' } : {}),
      },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, json: texto ? JSON.parse(texto) : {} };
  }
  const bandeja = async (u: UsuarioPrueba) => {
    const r = await pedir('GET', '/avisos', t(u));
    expect(r.estado).toBe(200);
    return r.json as Aviso[];
  };
  const avisosDe = (columna: 'evento_id' | 'etapa_tramite_id', origen: string) =>
    ctx.ds.query<FilaAviso[]>(
      `SELECT fecha_alerta, atendido, atendido_por, fecha_atencion FROM avisos
       WHERE ${columna} = $1 ORDER BY fecha_alerta`,
      [origen],
    );
  const alerta = (fecha: string) => new Date(`${fecha}T00:00:00-05:00`).toISOString();
  const resumen = (filas: FilaAviso[]) =>
    filas.map((f) => [f.fecha_alerta.toISOString(), f.atendido, f.atendido_por]);

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    reloj = ctx.app.select(AvisosModule).get(Reloj, { strict: true });
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-193 una cita reagendada genera aviso con alerta a 2 días; las cumplidas y canceladas no', async () => {
    fijarHora('2026-11-10T09:00:00');
    const dueno = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const cliente = await insertarCliente(ctx.ds, catalogo, dueno.id);
    const reagendada = await insertarEvento(ctx.ds, cliente, dueno.id, '2026-11-12', 'reagendado');
    const cumplida = await insertarEvento(ctx.ds, cliente, dueno.id, '2026-11-12', 'cumplido');
    const cancelada = await insertarEvento(ctx.ds, cliente, dueno.id, '2026-11-12', 'cancelado');
    const pendiente = await insertarEvento(ctx.ds, cliente, dueno.id, '2026-11-12', 'pendiente');

    const avisos = await bandeja(dueno);
    expect(avisos.map((a) => a.evento_id).sort()).toEqual([reagendada, pendiente].sort());
    const deCita = avisos.find((a) => a.evento_id === reagendada)!;
    expect(deCita).toMatchObject({ tipo: 'cita', atendido: false });
    expect(new Date(deCita.fecha_alerta).toISOString()).toBe('2026-11-10T05:00:00.000Z');
    expect(await avisosDe('evento_id', cumplida)).toEqual([]);
    expect(await avisosDe('evento_id', cancelada)).toEqual([]);

    // Pasa a cumplida: su aviso ya no es vigente (deja de salir en la bandeja).
    await pedir('PATCH', `/agenda/${reagendada}`, t(dueno), { estatus: 'cumplido' });
    expect((await bandeja(dueno)).map((a) => a.evento_id)).toEqual([pendiente]);
  });

  it('CP-194 mover una cita a un día cuya alerta ya existía y estaba atendida la deja pendiente; los avisos de otras fechas no se tocan', async () => {
    const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const evento = await insertarEvento(ctx.ds, cliente, asesor.id, '2026-11-12', 'pendiente');
    const propio = (aviso: Aviso) => aviso.evento_id === evento;

    // Alerta del 10/11 (cita del 12/11): se genera y se atiende.
    fijarHora('2026-11-10T09:00:00');
    const a = (await bandeja(asesor)).find(propio)!;
    expect((await pedir('PATCH', `/avisos/${a.id}/atender`, t(asesor))).estado).toBe(200);

    // La cita se mueve al 13/11 (alerta del 11/11), que se genera y también se atiende.
    expect(
      (
        await pedir('PATCH', `/agenda/${evento}`, t(asesor), {
          fecha: '2026-11-13',
          estatus: 'reagendado',
        })
      ).estado,
    ).toBe(200);
    fijarHora('2026-11-11T09:00:00');
    const b = (await bandeja(asesor)).find(propio)!;
    expect(new Date(b.fecha_alerta).toISOString()).toBe(alerta('2026-11-11'));
    await pedir('PATCH', `/avisos/${b.id}/atender`, t(asesor));
    expect(resumen(await avisosDe('evento_id', evento)).map((f) => f[1])).toEqual([true, true]);

    // Regresa al 12/11: la alerta del 10/11 (atendida) vuelve a estar pendiente; la del 11/11 no se toca.
    const r = await pedir('PATCH', `/agenda/${evento}`, t(asesor), { fecha: '2026-11-12' });
    expect(r.estado).toBe(200);
    const filas = await avisosDe('evento_id', evento);
    expect(filas.map((f) => f.fecha_alerta.toISOString())).toEqual([
      alerta('2026-11-10'),
      alerta('2026-11-11'),
    ]);
    expect(filas[0]).toMatchObject({ atendido: false, atendido_por: null, fecha_atencion: null });
    expect(filas[1]).toMatchObject({ atendido: true, atendido_por: asesor.id });
    expect(filas[1].fecha_atencion).not.toBeNull();
    // Y vuelve a salir en la campana como pendiente.
    const pendientes = (await bandeja(asesor)).filter((x) => propio(x) && !x.atendido);
    expect(pendientes.map((x) => x.id)).toEqual([a.id]);
  });

  it('CP-195 cambiar solo la hora de la cita reabre su aviso atendido; un PATCH sin cambio de fecha ni hora, o con otro campo, no lo reabre', async () => {
    const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const evento = await insertarEvento(ctx.ds, cliente, asesor.id, '2026-11-12', 'pendiente');
    fijarHora('2026-11-10T09:00:00');
    const a = (await bandeja(asesor)).find((x) => x.evento_id === evento)!;
    await pedir('PATCH', `/avisos/${a.id}/atender`, t(asesor));
    const atendido = async () => (await avisosDe('evento_id', evento))[0].atendido;

    // La misma fecha y hora (10:00), solo el motivo o el estatus: sigue atendido.
    await pedir('PATCH', `/agenda/${evento}`, t(asesor), { motivo: 'Otro motivo', hora: '10:00' });
    await pedir('PATCH', `/agenda/${evento}`, t(asesor), { fecha: '2026-11-12' });
    expect(await atendido()).toBe(true);

    // Otra hora: es un reagendado y el aviso vuelve a quedar pendiente.
    await pedir('PATCH', `/agenda/${evento}`, t(asesor), { hora: '16:30', estatus: 'reagendado' });
    expect(await atendido()).toBe(false);
  });

  it('CP-196 mover fecha_compromiso de una etapa a un día cuya alerta ya existía y estaba atendida la deja pendiente; otras fechas intactas', async () => {
    const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const etapa = await insertarEtapa(ctx.ds, cliente, 5, ID_ESTATUS['En proceso asesor'], 40);
    await fijarCompromiso(ctx.ds, etapa, '2026-11-12');
    const propio = (aviso: Aviso) => aviso.etapa_tramite_id === etapa;
    const ruta = `/clientes/${cliente}/etapas/${etapa}`;

    fijarHora('2026-11-10T09:00:00');
    const a = (await bandeja(asesor)).find(propio)!;
    await pedir('PATCH', `/avisos/${a.id}/atender`, t(asesor));

    expect((await pedir('PATCH', ruta, t(asesor), { fecha_compromiso: '2026-11-13' })).estado).toBe(
      200,
    );
    fijarHora('2026-11-11T09:00:00');
    const b = (await bandeja(asesor)).find(propio)!;
    expect(new Date(b.fecha_alerta).toISOString()).toBe(alerta('2026-11-11'));
    await pedir('PATCH', `/avisos/${b.id}/atender`, t(asesor));

    // Sin cambio de fecha (mismo valor o solo la acción): el aviso atendido de esa fecha sigue atendido.
    await pedir('PATCH', ruta, t(asesor), {
      fecha_compromiso: '2026-11-13',
      accion_a_realizar: 'x',
    });
    expect((await avisosDe('etapa_tramite_id', etapa)).map((f) => f.atendido)).toEqual([
      true,
      true,
    ]);

    // Regresa al 12/11: se reabre solo la alerta del 10/11.
    expect((await pedir('PATCH', ruta, t(asesor), { fecha_compromiso: '2026-11-12' })).estado).toBe(
      200,
    );
    const filas = await avisosDe('etapa_tramite_id', etapa);
    expect(filas.map((f) => f.fecha_alerta.toISOString())).toEqual([
      alerta('2026-11-10'),
      alerta('2026-11-11'),
    ]);
    expect(filas[0]).toMatchObject({ atendido: false, atendido_por: null, fecha_atencion: null });
    expect(filas[1]).toMatchObject({ atendido: true, atendido_por: asesor.id });
    expect(
      (await bandeja(asesor)).filter((x) => propio(x) && !x.atendido).map((x) => x.id),
    ).toEqual([a.id]);
  });

  it('CP-197 un cambio rechazado (400) no reabre el aviso atendido; un evento inexistente da 404', async () => {
    const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const etapa = await insertarEtapa(ctx.ds, cliente, 5, ID_ESTATUS['En proceso asesor'], 40);
    await fijarCompromiso(ctx.ds, etapa, '2026-11-12');
    fijarHora('2026-11-10T09:00:00');
    const a = (await bandeja(asesor)).find((x) => x.etapa_tramite_id === etapa)!;
    await pedir('PATCH', `/avisos/${a.id}/atender`, t(asesor));
    await pedir('PATCH', `/clientes/${cliente}/etapas/${etapa}`, t(asesor), {
      fecha_compromiso: '2026-11-13',
    });
    // Mover otra vez a la fecha atendida pero con un estatus Bloqueado SIN motivo: 400 y nada cambia.
    const mala = await pedir('PATCH', `/clientes/${cliente}/etapas/${etapa}`, t(asesor), {
      fecha_compromiso: '2026-11-12',
      estatus_id: ID_ESTATUS.Bloqueado,
    });
    expect(mala.estado).toBe(400);
    expect((await avisosDe('etapa_tramite_id', etapa))[0].atendido).toBe(true);

    expect(
      (await pedir('PATCH', `/agenda/${randomUUID()}`, t(asesor), { fecha: '2026-11-12' })).estado,
    ).toBe(404);
  });
});
