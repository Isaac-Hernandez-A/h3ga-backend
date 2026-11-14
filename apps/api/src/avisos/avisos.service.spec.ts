import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { Reloj } from '../common/fechas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  ID_ESTATUS,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  insertarEtapa,
  insertarEvento,
  fijarCompromiso,
  limpiarDatosClientes,
  MARCA_CLIENTE,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Avisos contra la base de pruebas real, con la hora fijada por el Reloj. Los avisos se generan al consultar
// la bandeja (sin tarea programada, RF-28); solo datos ficticios.
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

// D = fecha del compromiso. La alerta cae a las 00:00 de Cancún de D-2.
const D = '2026-11-12';
const enCancun = (fechaHora: string) => new Date(`${fechaHora}-05:00`);

describeConBd('Avisos (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let reloj: Reloj;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);
  const fijarHora = (fechaHora: string) =>
    jest.spyOn(reloj, 'ahora').mockReturnValue(enCancun(fechaHora));

  async function pedir(metodo: string, ruta: string, token?: string) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, json: texto ? JSON.parse(texto) : {} };
  }
  const bandeja = async (u: UsuarioPrueba, query = '') => {
    const r = await pedir('GET', `/avisos${query}`, t(u));
    expect(r.estado).toBe(200);
    return r.json as Aviso[];
  };
  const origenes = (avisos: Aviso[]) => avisos.map((a) => a.etapa_tramite_id ?? a.evento_id).sort();
  const cuantosEnBd = async (ids: string[]) =>
    Number(
      (
        await ctx.ds.query<{ n: string }[]>(
          `SELECT count(*) AS n FROM avisos WHERE etapa_tramite_id = ANY($1) OR evento_id = ANY($1)`,
          [ids],
        )
      )[0].n,
    );

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    reloj = ctx.app.get(Reloj);
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  // Etapa con compromiso en `fecha` y el estatus indicado, de un cliente nuevo del asesor.
  async function etapaCon(estatus: number, fecha: string, paso = 5, dueno = asesor) {
    const clienteId = await insertarCliente(ctx.ds, catalogo, dueno.id);
    const etapaId = await insertarEtapa(ctx.ds, clienteId, paso, estatus, 40);
    await fijarCompromiso(ctx.ds, etapaId, fecha);
    return { clienteId, etapaId };
  }

  it('CP-38 se generan avisos para etapas y eventos a 2 días o menos; no para Finalizado, Cancelado ni No aplica; las citas pendientes y reagendadas sí, las cumplidas y canceladas no', async () => {
    fijarHora('2026-11-10T09:00:00');
    const e = {
      porIniciar: await etapaCon(ID_ESTATUS['Por iniciar'], D),
      enProceso: await etapaCon(ID_ESTATUS['En proceso asesor'], '2026-11-11'),
      bloqueada: await etapaCon(ID_ESTATUS.Bloqueado, D),
      vencida: await etapaCon(ID_ESTATUS['En proceso cliente'], '2026-11-08'),
      lejana: await etapaCon(ID_ESTATUS['En proceso asesor'], '2026-11-13'),
      finalizada: await etapaCon(ID_ESTATUS.Finalizado, D),
      cancelada: await etapaCon(ID_ESTATUS.Cancelado, D),
      noAplica: await etapaCon(ID_ESTATUS['No aplica'], D),
    };
    const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const ev = {
      pendiente: await insertarEvento(ctx.ds, cliente, asesor.id, D, 'pendiente'),
      cumplido: await insertarEvento(ctx.ds, cliente, asesor.id, D, 'cumplido'),
      cancelado: await insertarEvento(ctx.ds, cliente, asesor.id, D, 'cancelado'),
      reagendado: await insertarEvento(ctx.ds, cliente, asesor.id, D, 'reagendado'),
      lejano: await insertarEvento(ctx.ds, cliente, asesor.id, '2026-11-20', 'pendiente'),
    };

    const avisos = await bandeja(asesor);
    expect(origenes(avisos)).toEqual(
      [
        e.porIniciar.etapaId,
        e.enProceso.etapaId,
        e.bloqueada.etapaId,
        e.vencida.etapaId,
        ev.pendiente,
        ev.reagendado, // una cita reagendada sigue siendo un compromiso por cumplir
      ].sort(),
    );
    const deEtapa = avisos.find((a) => a.etapa_tramite_id === e.porIniciar.etapaId)!;
    const deCita = avisos.find((a) => a.evento_id === ev.pendiente)!;
    expect(avisos.find((a) => a.evento_id === ev.reagendado)!.tipo).toBe('cita');
    expect(deEtapa.tipo).toBe('tramite');
    expect(deCita.tipo).toBe('cita');
    // La alerta cae a las 00:00 de Cancún de D-2 (05:00 UTC).
    expect(new Date(deEtapa.fecha_alerta).toISOString()).toBe('2026-11-10T05:00:00.000Z');
  });

  it('CP-39 dos consultas seguidas y dos en paralelo no duplican avisos', async () => {
    fijarHora('2026-11-10T09:00:00');
    const { etapaId } = await etapaCon(ID_ESTATUS['En proceso asesor'], D);
    const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const evento = await insertarEvento(ctx.ds, cliente, asesor.id, D);

    await bandeja(asesor);
    await bandeja(asesor);
    expect(await cuantosEnBd([etapaId, evento])).toBe(2);

    // En paralelo y con una etapa/evento nuevos que aún no tienen aviso.
    const nueva = await etapaCon(ID_ESTATUS['Por iniciar'], D);
    const nuevoEvento = await insertarEvento(ctx.ds, cliente, asesor.id, D);
    const respuestas = await Promise.all(
      [asesor, asesor, supervisor, supervisor].map((u) => pedir('GET', '/avisos', t(u))),
    );
    expect(respuestas.map((r) => r.estado)).toEqual([200, 200, 200, 200]);
    expect(await cuantosEnBd([nueva.etapaId, nuevoEvento])).toBe(2);
    expect(await cuantosEnBd([etapaId, evento])).toBe(2);
  });

  it('CP-40 borde de zona: a las 23:30 de Cancún del día D-3 no hay aviso; a las 00:00 del día D-2 sí', async () => {
    const { etapaId } = await etapaCon(ID_ESTATUS['En proceso asesor'], D);

    // D-3 = 2026-11-09, 23:30 en Cancún (04:30 UTC del día 10): en UTC ya sería D-2, en Cancún no.
    fijarHora('2026-11-09T23:30:00');
    expect(origenes(await bandeja(asesor))).not.toContain(etapaId);
    expect(await cuantosEnBd([etapaId])).toBe(0);

    fijarHora('2026-11-10T00:00:00');
    expect(origenes(await bandeja(asesor))).toContain(etapaId);
    expect(await cuantosEnBd([etapaId])).toBe(1);
  });

  it('CP-41 atender guarda atendido_por = sub y fecha_atencion; atender de nuevo conserva la primera fecha', async () => {
    fijarHora('2026-11-10T09:00:00');
    const { etapaId } = await etapaCon(ID_ESTATUS['En proceso asesor'], D);
    const aviso = (await bandeja(asesor)).find((a) => a.etapa_tramite_id === etapaId)!;
    expect(aviso.atendido).toBe(false);

    fijarHora('2026-11-10T10:15:00');
    const uno = await pedir('PATCH', `/avisos/${aviso.id}/atender`, t(asesor));
    expect(uno.estado).toBe(200);
    expect(uno.json).toMatchObject({ atendido: true, atendido_por: asesor.id });
    const primera = new Date(uno.json.fecha_atencion).toISOString();
    expect(primera).toBe(enCancun('2026-11-10T10:15:00').toISOString());

    fijarHora('2026-11-11T08:00:00');
    const dos = await pedir('PATCH', `/avisos/${aviso.id}/atender`, t(asesor));
    expect(dos.estado).toBe(200);
    expect(new Date(dos.json.fecha_atencion).toISOString()).toBe(primera);
    expect(dos.json.atendido_por).toBe(asesor.id);

    // Un usuario fuera del alcance no lo ve ni lo atiende.
    expect((await pedir('PATCH', `/avisos/${aviso.id}/atender`, t(otroAsesor))).estado).toBe(404);
    // El filtro por atendido funciona.
    expect(origenes(await bandeja(asesor, '?atendido=true'))).toContain(etapaId);
    expect(origenes(await bandeja(asesor, '?atendido=false'))).not.toContain(etapaId);
  });

  it('CP-42 avisos: el asesor ve los de sus clientes, el auxiliar los de autorizados, el supervisor todos', async () => {
    fijarHora('2026-11-10T09:00:00');
    const deA = await etapaCon(ID_ESTATUS['En proceso asesor'], D, 5, asesor);
    const deB = await etapaCon(ID_ESTATUS['En proceso asesor'], D, 5, otroAsesor);
    const eventoB = await insertarEvento(ctx.ds, deB.clienteId, otroAsesor.id, D);
    await autorizarEnBd(ctx.ds, deB.clienteId, auxiliar.id, otroAsesor.id, true);
    await autorizarEnBd(ctx.ds, deA.clienteId, auxiliar.id, asesor.id, false);

    expect(origenes(await bandeja(asesor))).toEqual(expect.arrayContaining([deA.etapaId]));
    expect(origenes(await bandeja(asesor))).not.toContain(deB.etapaId);
    expect(origenes(await bandeja(otroAsesor))).toEqual(
      expect.arrayContaining([deB.etapaId, eventoB]),
    );
    expect(origenes(await bandeja(otroAsesor))).not.toContain(deA.etapaId);
    // Auxiliar: solo la autorización ACTIVA cuenta.
    expect(origenes(await bandeja(auxiliar))).toEqual([deB.etapaId, eventoB].sort());
    expect(origenes(await bandeja(supervisor))).toEqual(
      expect.arrayContaining([deA.etapaId, deB.etapaId, eventoB]),
    );
  });

  it('un aviso deja de aparecer si la etapa se finaliza o el compromiso se mueve fuera de la ventana', async () => {
    fijarHora('2026-11-10T09:00:00');
    const { etapaId } = await etapaCon(ID_ESTATUS['En proceso asesor'], D);
    expect(origenes(await bandeja(asesor))).toContain(etapaId);

    await ctx.ds.query('UPDATE etapas_tramite SET estatus_id = $2 WHERE id = $1', [
      etapaId,
      ID_ESTATUS.Finalizado,
    ]);
    expect(origenes(await bandeja(asesor))).not.toContain(etapaId);

    await ctx.ds.query('UPDATE etapas_tramite SET estatus_id = $2 WHERE id = $1', [
      etapaId,
      ID_ESTATUS['En proceso asesor'],
    ]);
    await fijarCompromiso(ctx.ds, etapaId, '2026-12-30');
    expect(origenes(await bandeja(asesor))).not.toContain(etapaId);
  });

  it('CP-43 con 1,000 eventos sembrados, agenda y avisos responden en menos de 5 s (RNF-01)', async () => {
    fijarHora('2026-11-10T09:00:00');
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    await ctx.ds.query(
      `INSERT INTO eventos_agenda (asesor_id, cliente_id, fecha, hora, motivo, estatus)
       SELECT $1, $2, DATE '2026-11-10' + (g % 3), '09:00', 'Cita ficticia ' || g, 'pendiente'
         FROM generate_series(1, 1000) g`,
      [asesor.id, clienteId],
    );

    const t0 = Date.now();
    const agenda = await pedir('GET', '/agenda', t(asesor));
    const tAgenda = Date.now() - t0;
    expect(agenda.estado).toBe(200);
    expect((agenda.json as unknown[]).length).toBeGreaterThanOrEqual(1000);
    expect(tAgenda).toBeLessThan(5000);

    const t1 = Date.now();
    const avisos = await bandeja(asesor);
    const tAvisos = Date.now() - t1;
    expect(avisos.length).toBeGreaterThanOrEqual(1000);
    expect(tAvisos).toBeLessThan(5000);

    // Segunda consulta: ya generados, no duplica y sigue rápido.
    const t2 = Date.now();
    expect((await bandeja(asesor)).length).toBe(avisos.length);
    expect(Date.now() - t2).toBeLessThan(5000);
    expect(MARCA_CLIENTE).toBeDefined();
  });
});
