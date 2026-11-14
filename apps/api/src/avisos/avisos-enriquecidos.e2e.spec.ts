import { randomUUID } from 'node:crypto';
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
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Avisos enriquecidos con los datos de su origen (cliente, asesor, título, descripción, compromiso).
// Aplicación real y base de pruebas, con la hora fijada por el Reloj; solo datos ficticios.
jest.setTimeout(120_000);

interface AvisoRico {
  id: string;
  tipo: string;
  etapa_tramite_id: string | null;
  evento_id: string | null;
  fecha_alerta: string;
  atendido: boolean;
  atendido_por: string | null;
  fecha_atencion: string | null;
  cliente_id: string;
  cliente_nombre: string;
  asesor_id: string;
  asesor_nombre: string;
  titulo: string;
  descripcion: string | null;
  fecha_compromiso: string;
  hora: string | null;
  numero_paso: number | null;
  avance_porcentaje: number | null;
  estatus_id: number | null;
}

const D = '2026-11-12';
const enCancun = (fechaHora: string) => new Date(`${fechaHora}-05:00`);
const CAMPOS_ANTIGUOS = [
  'id',
  'tipo',
  'etapa_tramite_id',
  'evento_id',
  'fecha_alerta',
  'atendido',
  'atendido_por',
  'fecha_atencion',
];
const CAMPOS_NUEVOS = [
  'cliente_id',
  'cliente_nombre',
  'asesor_id',
  'asesor_nombre',
  'titulo',
  'descripcion',
  'fecha_compromiso',
  'hora',
  'numero_paso',
  'avance_porcentaje',
  'estatus_id',
];

describeConBd('Avisos enriquecidos (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let reloj: Reloj;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

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
    return r.json as AvisoRico[];
  };

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    reloj = ctx.app.get(Reloj);
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    await ctx.ds.query(
      `UPDATE usuarios SET nombre = 'Elena', apellido_paterno = 'Rivas', apellido_materno = 'Soto' WHERE id = $1`,
      [asesor.id],
    );
    await ctx.ds.query(
      `UPDATE usuarios SET nombre = 'Mateo', apellido_paterno = 'Lara', apellido_materno = 'Gil' WHERE id = $1`,
      [otroAsesor.id],
    );
  });

  beforeEach(() => jest.spyOn(reloj, 'ahora').mockReturnValue(enCancun('2026-11-10T09:00:00')));
  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  async function nombreDe(clienteId: string): Promise<string> {
    const [c] = await ctx.ds.query<{ n: string }[]>(
      `SELECT concat_ws(' ', nombre, apellido_paterno, apellido_materno) AS n FROM clientes WHERE id = $1`,
      [clienteId],
    );
    return c.n;
  }

  // Cliente nuevo con una etapa (paso 5, compromiso D) y, si se pide, una cita en D.
  async function escenario(dueno: UsuarioPrueba, conCita = false) {
    const clienteId = await insertarCliente(ctx.ds, catalogo, dueno.id);
    const etapaId = await insertarEtapa(ctx.ds, clienteId, 5, ID_ESTATUS['En proceso asesor'], 40);
    await fijarCompromiso(ctx.ds, etapaId, D);
    await ctx.ds.query(`UPDATE etapas_tramite SET accion_a_realizar = $2 WHERE id = $1`, [
      etapaId,
      'Entregar la constancia al cliente.',
    ]);
    const eventoId = conCita ? await insertarEvento(ctx.ds, clienteId, dueno.id, D) : null;
    return { clienteId, etapaId, eventoId };
  }

  it('CP-146 un aviso de trámite y uno de cita traen cliente, asesor, título, descripción, compromiso, hora y datos de la etapa', async () => {
    const e = await escenario(asesor, true);
    const avisos = await bandeja(asesor);
    const [{ nombre_etapa }] = await ctx.ds.query<{ nombre_etapa: string }[]>(
      `SELECT ep.nombre AS nombre_etapa FROM etapas_proceso ep WHERE ep.numero_paso = 5`,
    );

    const tramite = avisos.find((a) => a.etapa_tramite_id === e.etapaId)!;
    expect(tramite).toMatchObject({
      tipo: 'tramite',
      cliente_id: e.clienteId,
      cliente_nombre: await nombreDe(e.clienteId),
      asesor_id: asesor.id,
      asesor_nombre: 'Elena Rivas',
      titulo: nombre_etapa,
      descripcion: 'Entregar la constancia al cliente.',
      fecha_compromiso: D,
      hora: null,
      numero_paso: 5,
      avance_porcentaje: 40,
      estatus_id: ID_ESTATUS['En proceso asesor'],
    });

    const cita = avisos.find((a) => a.evento_id === e.eventoId)!;
    expect(cita).toMatchObject({
      tipo: 'cita',
      cliente_id: e.clienteId,
      cliente_nombre: await nombreDe(e.clienteId),
      asesor_id: asesor.id,
      asesor_nombre: 'Elena Rivas',
      titulo: 'Cita programada',
      descripcion: 'Cita ficticia de prueba',
      fecha_compromiso: D,
      hora: '10:00:00',
      numero_paso: null,
      avance_porcentaje: null,
      estatus_id: null,
    });
  });

  it('CP-147 la etapa sin accion_a_realizar da descripcion null; los campos antiguos no cambian y no se expone nada más del asesor', async () => {
    const e = await escenario(asesor);
    await ctx.ds.query(`UPDATE etapas_tramite SET accion_a_realizar = NULL WHERE id = $1`, [
      e.etapaId,
    ]);
    const aviso = (await bandeja(asesor)).find((a) => a.etapa_tramite_id === e.etapaId)!;
    expect(aviso.descripcion).toBeNull();
    expect(Object.keys(aviso).sort()).toEqual([...CAMPOS_ANTIGUOS, ...CAMPOS_NUEVOS].sort());
    expect(aviso).toMatchObject({
      etapa_tramite_id: e.etapaId,
      evento_id: null,
      atendido: false,
      atendido_por: null,
      fecha_atencion: null,
    });
    expect(new Date(aviso.fecha_alerta).toISOString()).toBe('2026-11-10T05:00:00.000Z');
    expect(JSON.stringify(aviso)).not.toContain('@');
    expect(JSON.stringify(aviso)).not.toContain('hash');
  });

  it('CP-148 el filtro atendido sigue funcionando y un aviso atendido conserva atendido_por y fecha_atencion enriquecido', async () => {
    const e = await escenario(asesor);
    const aviso = (await bandeja(asesor)).find((a) => a.etapa_tramite_id === e.etapaId)!;
    const atendido = await pedir('PATCH', `/avisos/${aviso.id}/atender`, t(asesor));
    expect(atendido.estado).toBe(200);
    expect(atendido.json).toMatchObject({
      id: aviso.id,
      atendido: true,
      atendido_por: asesor.id,
      cliente_id: e.clienteId,
      cliente_nombre: await nombreDe(e.clienteId),
      asesor_nombre: 'Elena Rivas',
      titulo: aviso.titulo,
      fecha_compromiso: D,
      numero_paso: 5,
    });
    expect(atendido.json.fecha_atencion).not.toBeNull();

    const pendientes = await bandeja(asesor, '?atendido=false');
    expect(pendientes.map((a) => a.id)).not.toContain(aviso.id);
    const atendidos = await bandeja(asesor, '?atendido=true');
    const mismo = atendidos.find((a) => a.id === aviso.id)!;
    expect(mismo.atendido_por).toBe(asesor.id);
    expect(mismo.fecha_atencion).toBe(atendido.json.fecha_atencion);
    expect(mismo.cliente_nombre).toBe(await nombreDe(e.clienteId));

    // Atender de nuevo conserva quién y cuándo, y sigue enriquecido.
    const otra = await pedir('PATCH', `/avisos/${aviso.id}/atender`, t(asesor));
    expect(otra.json.fecha_atencion).toBe(atendido.json.fecha_atencion);
    expect(otra.json.titulo).toBe(aviso.titulo);
  });

  it('CP-149 el auxiliar recibe solo los de sus clientes autorizados y ve asesor_nombre; el supervisor recibe todos', async () => {
    const mio = await escenario(asesor);
    const ajeno = await escenario(otroAsesor, true);
    await autorizarEnBd(ctx.ds, ajeno.clienteId, auxiliar.id, otroAsesor.id, true);
    await autorizarEnBd(ctx.ds, mio.clienteId, auxiliar.id, asesor.id, false);

    const delAuxiliar = await bandeja(auxiliar);
    expect(delAuxiliar.map((a) => a.cliente_id)).toEqual([ajeno.clienteId, ajeno.clienteId]);
    expect(delAuxiliar.every((a) => a.asesor_nombre === 'Mateo Lara')).toBe(true);
    expect(delAuxiliar.every((a) => a.asesor_id === otroAsesor.id)).toBe(true);

    const delSupervisor = await bandeja(supervisor);
    const clientes = delSupervisor.map((a) => a.cliente_id);
    expect(clientes).toEqual(expect.arrayContaining([mio.clienteId, ajeno.clienteId]));
    const delMio = delSupervisor.find((a) => a.cliente_id === mio.clienteId)!;
    expect(delMio.asesor_nombre).toBe('Elena Rivas');
  });

  it('CP-150 GET /avisos/:id devuelve el aviso enriquecido; ajeno o inexistente 404; id inválido 400; sin token 401', async () => {
    const e = await escenario(asesor, true);
    const lista = await bandeja(asesor);
    const deCita = lista.find((a) => a.evento_id === e.eventoId)!;
    const deEtapa = lista.find((a) => a.etapa_tramite_id === e.etapaId)!;

    const uno = await pedir('GET', `/avisos/${deCita.id}`, t(asesor));
    expect(uno.estado).toBe(200);
    expect(uno.json).toEqual(deCita);
    const otro = await pedir('GET', `/avisos/${deEtapa.id}`, t(supervisor));
    expect(otro.estado).toBe(200);
    expect(otro.json).toEqual(deEtapa);

    await autorizarEnBd(ctx.ds, e.clienteId, auxiliar.id, asesor.id, true);
    const delAuxiliar = await pedir('GET', `/avisos/${deEtapa.id}`, t(auxiliar));
    expect(delAuxiliar.estado).toBe(200);
    expect(delAuxiliar.json.asesor_nombre).toBe('Elena Rivas');

    expect((await pedir('GET', `/avisos/${deEtapa.id}`, t(otroAsesor))).estado).toBe(404);
    expect((await pedir('GET', `/avisos/${randomUUID()}`, t(asesor))).estado).toBe(404);
    expect((await pedir('GET', '/avisos/no-es-uuid', t(asesor))).estado).toBe(400);
    expect((await pedir('GET', `/avisos/${deEtapa.id}`)).estado).toBe(401);
  });

  it('CP-151 PATCH atender: aviso ajeno o inexistente 404 y sin token 401', async () => {
    const e = await escenario(asesor);
    const aviso = (await bandeja(asesor)).find((a) => a.etapa_tramite_id === e.etapaId)!;
    expect((await pedir('PATCH', `/avisos/${aviso.id}/atender`, t(otroAsesor))).estado).toBe(404);
    expect((await pedir('PATCH', `/avisos/${randomUUID()}/atender`, t(asesor))).estado).toBe(404);
    expect((await pedir('PATCH', `/avisos/${aviso.id}/atender`)).estado).toBe(401);
  });

  it('CP-152 listar 10 avisos no hace más consultas que listar 2 (sin consultas por aviso)', async () => {
    const poco = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const mucho = await crearUsuarioPrueba(ctx.ds, 'asesor');
    for (let i = 0; i < 2; i++) await escenario(poco);
    for (let i = 0; i < 5; i++) await escenario(mucho, true);
    // Se generan una vez; después solo se cuentan las consultas de una bandeja ya generada.
    expect(await bandeja(poco)).toHaveLength(2);
    expect(await bandeja(mucho)).toHaveLength(10);

    const proto = Object.getPrototypeOf(ctx.ds.createQueryRunner());
    const espia = jest.spyOn(proto, 'query');
    await bandeja(poco);
    const consultasConDos = espia.mock.calls.length;
    espia.mockClear();
    await bandeja(mucho);
    const consultasConDiez = espia.mock.calls.length;
    expect(consultasConDos).toBeGreaterThan(0);
    expect(consultasConDiez).toBe(consultasConDos);
  });
});
