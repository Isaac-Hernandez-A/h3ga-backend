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
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Dashboard de Inicio: resumen ya calculado, con el alcance del usuario. Aplicación real y base de pruebas,
// con la hora fijada por el Reloj (hoy = 2026-11-15 en Cancún); solo datos ficticios.
jest.setTimeout(120_000);

const HOY = '2026-11-15';
type Estatus = keyof typeof ID_ESTATUS;

interface Dashboard {
  fecha: string;
  resumen: {
    clientes_activos: number;
    clientes_pensionados: number;
    asesores_activos: number | null;
    acciones_proximas_mes: number;
    documentos_por_confirmar: number;
    documentos_con_observaciones: number;
    clientes_avance_detenido: number;
  };
  clientes_por_etapa: { numero_paso: number; nombre: string; clientes: number }[];
  documentos_por_estatus: { si: number; por_confirmar: number; no: number };
  acciones_del_mes: Record<string, unknown>[];
  total_acciones_del_mes: number;
  documentos_pendientes: Record<string, unknown>[];
  total_documentos_pendientes: number;
  clientes_detenidos: Record<string, unknown>[];
  carga_por_asesor: Record<string, unknown>[] | null;
  avance_por_cliente: AvanceCliente[] | null;
  total_avance_por_cliente: number | null;
}

interface AvanceCliente {
  cliente_id: string;
  cliente_nombre: string;
  etapas: { numero_paso: number; avance_porcentaje: number; estatus_id: number | null }[];
}

describeConBd('Dashboard (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let reloj: Reloj;
  let catalogo: IdsCatalogo;
  let tipoDocumento: { id: number; nombre: string };
  let asesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);
  const c: Record<string, string> = {};
  const nombres: Record<string, string> = {};

  async function pedir(ruta: string, token?: string) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, json: texto ? JSON.parse(texto) : {} };
  }
  const dashboard = async (u: UsuarioPrueba, query = '') => {
    const r = await pedir(`/dashboard${query}`, t(u));
    expect(r.estado).toBe(200);
    return r.json as Dashboard;
  };

  // Cliente nuevo con las etapas indicadas (paso → estatus). `actualizado` es el instante de actualizado_el.
  async function cliente(
    dueno: UsuarioPrueba,
    etapas: Record<number, Estatus>,
    actualizado = '2026-11-14T12:00:00-05:00',
  ) {
    const id = await insertarCliente(ctx.ds, catalogo, dueno.id);
    const porPaso: Record<number, string> = {};
    for (const [paso, estatus] of Object.entries(etapas)) {
      porPaso[Number(paso)] = await insertarEtapa(
        ctx.ds,
        id,
        Number(paso),
        ID_ESTATUS[estatus],
        50,
      );
    }
    await ctx.ds.query(`UPDATE etapas_tramite SET actualizado_el = $2 WHERE cliente_id = $1`, [
      id,
      actualizado,
    ]);
    const [fila] = await ctx.ds.query<{ n: string }[]>(
      `SELECT concat_ws(' ', nombre, apellido_paterno, apellido_materno) AS n FROM clientes WHERE id = $1`,
      [id],
    );
    nombres[id] = fila.n;
    return { id, porPaso };
  }
  const compromiso = (etapaId: string, fecha: string, completada: string | null = null) =>
    ctx.ds.query(
      `UPDATE etapas_tramite SET fecha_compromiso = $2, fecha_completada = $3, accion_a_realizar = 'Acción ficticia' WHERE id = $1`,
      [etapaId, fecha, completada],
    );
  const documento = (
    clienteId: string,
    estatus: 'si' | 'no' | 'por_confirmar',
    fechaCarga: string,
    subidoPor: UsuarioPrueba,
  ) =>
    ctx.ds.query(
      `INSERT INTO documentos_clientes (cliente_id, tipo_documento_id, archivo_path, nombre_archivo_original,
         mime_type, estatus, fecha_carga, subido_por)
       VALUES ($1, $2, 'ficticio/ruta.pdf', 'ruta.pdf', 'application/pdf', $3, $4, $5)`,
      [clienteId, tipoDocumento.id, estatus, fechaCarga, subidoPor.id],
    );
  const finalizadas = (hasta: number): Record<number, Estatus> =>
    Object.fromEntries(Array.from({ length: hasta + 1 }, (_, i) => [i, 'Finalizado' as Estatus]));

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    reloj = ctx.app.get(Reloj);
    jest.spyOn(reloj, 'ahora').mockReturnValue(new Date(`${HOY}T09:00:00-05:00`));
    catalogo = await idsDeCatalogo(ctx.ds);
    [tipoDocumento] = await ctx.ds.query(
      `SELECT id, nombre FROM tipo_documento ORDER BY id LIMIT 1`,
    );
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    await ctx.ds.query(
      `UPDATE usuarios SET nombre = 'Elena', apellido_paterno = 'Rivas', apellido_materno = 'Soto' WHERE id = $1`,
      [asesor.id],
    );

    // c1: pensionado (etapa 15 Finalizado).
    c.pensionado = (await cliente(asesor, finalizadas(15))).id;
    // c2: etapa actual 1 (En proceso asesor); la 2 por iniciar no cuenta.
    const c2 = await cliente(asesor, {
      0: 'Finalizado',
      1: 'En proceso asesor',
      2: 'Por iniciar',
    });
    c.enProceso = c2.id;
    // c3: bloqueada en la 3; el bloqueo gana a la 2 "Por iniciar".
    const c3 = await cliente(asesor, {
      0: 'Finalizado',
      1: 'Finalizado',
      2: 'Por iniciar',
      3: 'Bloqueado',
    });
    c.bloqueada = c3.id;
    // c4: detenida en la 1.
    const c4 = await cliente(asesor, { 0: 'Finalizado', 1: 'Detenido' });
    c.detenida = c4.id;
    // c5: solo por iniciar: la de menor paso (0).
    const c5 = await cliente(asesor, { 0: 'Por iniciar', 1: 'Cancelado' });
    c.porIniciar = c5.id;
    // c6: todo finalizado salvo la 15 por iniciar: etapa actual 15.
    c.final = (await cliente(asesor, { ...finalizadas(14), 15: 'Por iniciar' })).id;
    // c7: 15 días sin actividad (último 2026-10-31) → detenido; c8: 14 días → no.
    c.quince = (await cliente(asesor, { 1: 'En proceso cliente' }, '2026-10-31T12:00:00-05:00')).id;
    c.catorce = (
      await cliente(
        asesor,
        { 0: 'No aplica', 1: 'En proceso cliente' },
        '2026-11-01T12:00:00-05:00',
      )
    ).id;

    // Acciones del mes (noviembre de 2026; hoy 15).
    await compromiso(c2.porPaso[1], '2026-11-20'); // próxima
    await compromiso(c2.porPaso[2], '2026-12-01'); // otro mes
    await compromiso(c3.porPaso[3], '2026-11-10'); // vencida
    await compromiso(c3.porPaso[0], '2026-11-05'); // completada (Finalizada)
    await compromiso(c4.porPaso[1], '2026-11-15'); // próxima (hoy no es anterior a hoy)
    await compromiso(c5.porPaso[0], '2026-11-30', '2026-11-14'); // completada (tiene fecha_completada)
    await compromiso(c5.porPaso[1], '2026-11-12'); // Cancelado: excluida
    const c9 = await ctx.ds.query<{ id: string }[]>(
      `SELECT id FROM etapas_tramite WHERE cliente_id = $1 AND estatus_id = $2`,
      [c.catorce, ID_ESTATUS['No aplica']],
    );
    await compromiso(c9[0].id, '2026-11-12'); // No aplica: excluida
    const octubre = await ctx.ds.query<{ id: string }[]>(
      `SELECT id FROM etapas_tramite WHERE cliente_id = $1 AND etapa_id = (SELECT id FROM etapas_proceso WHERE numero_paso = 14)`,
      [c.final],
    );
    await compromiso(octubre[0].id, '2026-10-30'); // otro mes
    const delPensionado = await ctx.ds.query<{ id: string }[]>(
      `SELECT id FROM etapas_tramite WHERE cliente_id = $1 LIMIT 1`,
      [c.pensionado],
    );
    await compromiso(delPensionado[0].id, '2026-11-20'); // cliente pensionado: excluida

    // Documentos: solo cuentan los de clientes activos.
    await documento(c.enProceso, 'si', '2026-11-01T10:00:00-05:00', asesor);
    await documento(c.enProceso, 'por_confirmar', '2026-11-03T10:00:00-05:00', asesor);
    await documento(c.enProceso, 'no', '2026-11-02T10:00:00-05:00', asesor);
    await documento(c.porIniciar, 'por_confirmar', '2026-11-04T10:00:00-05:00', asesor);
    await documento(c.pensionado, 'por_confirmar', '2026-11-01T08:00:00-05:00', asesor);
    await documento(c.pensionado, 'no', '2026-11-01T09:00:00-05:00', asesor);

    // El auxiliar solo ve c2 y c4 (la autorización de c5 está inactiva).
    await autorizarEnBd(ctx.ds, c.enProceso, auxiliar.id, asesor.id, true);
    await autorizarEnBd(ctx.ds, c.detenida, auxiliar.id, asesor.id, true);
    await autorizarEnBd(ctx.ds, c.porIniciar, auxiliar.id, asesor.id, false);
  });

  afterAll(async () => {
    if (!ctx) return;
    jest.restoreAllMocks();
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-153 cliente activo vs pensionado, resumen y fecha de hoy en Cancún', async () => {
    const d = await dashboard(asesor);
    expect(d.fecha).toBe(HOY);
    expect(d.resumen).toMatchObject({
      clientes_activos: 7,
      clientes_pensionados: 1,
      asesores_activos: null,
      acciones_proximas_mes: 2,
      documentos_por_confirmar: 2,
      documentos_con_observaciones: 1,
      clientes_avance_detenido: 2,
    });
  });

  it('CP-154 etapa actual: en proceso, bloqueada, detenida, por iniciar y todo finalizado; 16 filas que suman los activos', async () => {
    const d = await dashboard(asesor);
    expect(d.clientes_por_etapa).toHaveLength(16);
    expect(d.clientes_por_etapa.map((e) => e.numero_paso)).toEqual(
      Array.from({ length: 16 }, (_, i) => i),
    );
    expect(d.clientes_por_etapa[1].nombre).toBe('Diagnóstico especializado');
    const porPaso = Object.fromEntries(
      d.clientes_por_etapa.map((e) => [e.numero_paso, e.clientes]),
    );
    // paso 0: c5 (por iniciar); paso 1: c2, c4 (detenida), c7 y c8 (en proceso cliente); 3: c3 (bloqueada); 15: c6.
    expect(porPaso).toEqual({
      0: 1,
      1: 4,
      2: 0,
      3: 1,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
      13: 0,
      14: 0,
      15: 1,
    });
    const suma = d.clientes_por_etapa.reduce((s, e) => s + e.clientes, 0);
    expect(suma).toBe(d.resumen.clientes_activos);
  });

  it('CP-155 avance detenido: etapa Detenido o 15 días sin actividad (14 días no cuenta); más días primero', async () => {
    const d = await dashboard(asesor);
    expect(d.resumen.clientes_avance_detenido).toBe(2);
    expect(d.clientes_detenidos).toHaveLength(2);
    expect(d.clientes_detenidos[0]).toEqual({
      cliente_id: c.quince,
      cliente_nombre: nombres[c.quince],
      asesor_id: asesor.id,
      asesor_nombre: 'Elena Rivas',
      etapa_actual: 'Diagnóstico especializado',
      estatus_id: ID_ESTATUS['En proceso cliente'],
      estatus: 'En proceso cliente',
      ultima_actividad: '2026-10-31',
      dias_sin_actividad: 15,
    });
    expect(d.clientes_detenidos[1]).toMatchObject({
      cliente_id: c.detenida,
      estatus_id: ID_ESTATUS.Detenido,
      estatus: 'Detenido',
      ultima_actividad: '2026-11-14',
      dias_sin_actividad: 1,
    });
    expect(d.clientes_detenidos.map((x) => x.cliente_id)).not.toContain(c.catorce);
  });

  it('CP-156 acciones del mes: tres estados, excluye Cancelado, No aplica, otros meses y pensionados; orden y límite con total completo', async () => {
    const d = await dashboard(asesor);
    expect(d.total_acciones_del_mes).toBe(5);
    expect(d.acciones_del_mes.map((a) => [a.fecha_compromiso, a.estado])).toEqual([
      ['2026-11-05', 'completada'],
      ['2026-11-10', 'vencida'],
      ['2026-11-15', 'proxima'],
      ['2026-11-20', 'proxima'],
      ['2026-11-30', 'completada'],
    ]);
    expect(d.acciones_del_mes[1]).toEqual({
      cliente_id: c.bloqueada,
      cliente_nombre: nombres[c.bloqueada],
      asesor_id: asesor.id,
      asesor_nombre: 'Elena Rivas',
      numero_paso: 3,
      etapa: 'Unificación de NSS',
      fecha_compromiso: '2026-11-10',
      accion_a_realizar: 'Acción ficticia',
      estado: 'vencida',
    });

    const corto = await dashboard(asesor, '?limite=2');
    expect(corto.acciones_del_mes).toHaveLength(2);
    expect(corto.total_acciones_del_mes).toBe(5);
    expect(corto.resumen.acciones_proximas_mes).toBe(2);
  });

  it('CP-157 documentos: conteos solo de clientes activos, pendientes por fecha de carga con total, y límite', async () => {
    const d = await dashboard(asesor);
    expect(d.documentos_por_estatus).toEqual({ si: 1, por_confirmar: 2, no: 1 });
    expect(d.total_documentos_pendientes).toBe(3);
    expect(d.documentos_pendientes.map((x) => x.estatus)).toEqual([
      'no',
      'por_confirmar',
      'por_confirmar',
    ]);
    expect(d.documentos_pendientes[0]).toMatchObject({
      cliente_id: c.enProceso,
      cliente_nombre: nombres[c.enProceso],
      tipo_documento_id: tipoDocumento.id,
      tipo_documento: tipoDocumento.nombre,
      estatus: 'no',
      subido_por_id: asesor.id,
      subido_por_nombre: 'Elena Rivas',
      etapa_actual: 'Diagnóstico especializado',
    });
    expect(d.documentos_pendientes[0].documento_id).toEqual(expect.any(String));
    expect(new Date(d.documentos_pendientes[0].fecha_carga as string).toISOString()).toBe(
      '2026-11-02T15:00:00.000Z',
    );
    expect(d.documentos_pendientes.map((x) => x.cliente_id)).not.toContain(c.pensionado);

    const corto = await dashboard(asesor, '?limite=1');
    expect(corto.documentos_pendientes).toHaveLength(1);
    expect(corto.total_documentos_pendientes).toBe(3);
    expect(corto.resumen.documentos_por_confirmar).toBe(2);
    const dos = await dashboard(asesor, '?limite=1');
    expect(dos.clientes_detenidos).toHaveLength(1);
    expect(dos.resumen.clientes_avance_detenido).toBe(2);
  });

  it('CP-158 alcance por rol: el auxiliar solo ve sus clientes autorizados activos; el supervisor ve todo con asesores y carga', async () => {
    const aux = await dashboard(auxiliar);
    expect(aux.resumen).toMatchObject({
      clientes_activos: 2,
      clientes_pensionados: 0,
      asesores_activos: null,
      clientes_avance_detenido: 1,
      documentos_por_confirmar: 1,
      documentos_con_observaciones: 1,
    });
    expect(aux.carga_por_asesor).toBeNull();
    expect(aux.documentos_por_estatus).toEqual({ si: 1, por_confirmar: 1, no: 1 });
    expect(aux.acciones_del_mes.map((a) => a.cliente_id).sort()).toEqual(
      [c.enProceso, c.detenida].sort(),
    );
    expect(aux.acciones_del_mes[0].asesor_nombre).toBe('Elena Rivas');

    const otro = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const vacio = await dashboard(otro);
    expect(vacio.resumen.clientes_activos).toBe(0);
    expect(vacio.carga_por_asesor).toBeNull();

    const sup = await dashboard(supervisor);
    expect(sup.resumen.asesores_activos).toBeGreaterThanOrEqual(2);
    expect(sup.resumen.clientes_activos).toBeGreaterThanOrEqual(7);
    expect(sup.clientes_por_etapa).toHaveLength(16);
    const mia = sup.carga_por_asesor!.find((f) => f.asesor_id === asesor.id);
    expect(mia).toEqual({
      asesor_id: asesor.id,
      asesor_nombre: 'Elena Rivas',
      clientes_activos: 7,
      clientes_detenidos: 2,
      clientes_pensionados: 1,
    });
    expect(sup.carga_por_asesor!.map((f) => f.asesor_id)).not.toContain(otro.id);
  });

  it('CP-159 un asesor sin clientes recibe todo en cero: 16 etapas, listas vacías y totales 0', async () => {
    const nuevo = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const d = await dashboard(nuevo);
    expect(d.resumen).toEqual({
      clientes_activos: 0,
      clientes_pensionados: 0,
      asesores_activos: null,
      acciones_proximas_mes: 0,
      documentos_por_confirmar: 0,
      documentos_con_observaciones: 0,
      clientes_avance_detenido: 0,
    });
    expect(d.clientes_por_etapa).toHaveLength(16);
    expect(d.clientes_por_etapa.every((e) => e.clientes === 0)).toBe(true);
    expect(d.documentos_por_estatus).toEqual({ si: 0, por_confirmar: 0, no: 0 });
    expect(d.acciones_del_mes).toEqual([]);
    expect(d.total_acciones_del_mes).toBe(0);
    expect(d.documentos_pendientes).toEqual([]);
    expect(d.total_documentos_pendientes).toBe(0);
    expect(d.clientes_detenidos).toEqual([]);
    expect(d.carga_por_asesor).toBeNull();
  });

  it('CP-160 ?limite inválido (0, 51, "x", 1.5) responde 400 en español; 1 y 50 son válidos; sin token 401', async () => {
    for (const malo of ['0', '51', 'x', '1.5', '-3']) {
      const r = await pedir(`/dashboard?limite=${malo}`, t(asesor));
      expect(r.estado).toBe(400);
      expect(JSON.stringify(r.json.message)).toMatch(/limite/);
    }
    expect((await pedir('/dashboard?limite=1', t(asesor))).estado).toBe(200);
    expect((await pedir('/dashboard?limite=50', t(asesor))).estado).toBe(200);
    expect((await pedir('/dashboard')).estado).toBe(401);
  });

  it('CP-161 sin N+1: el número de consultas no crece con el número de clientes', async () => {
    const pocos = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const muchos = await crearUsuarioPrueba(ctx.ds, 'asesor');
    await cliente(pocos, { 0: 'Finalizado', 1: 'En proceso asesor' });
    for (let i = 0; i < 12; i++) {
      const x = await cliente(muchos, { 0: 'Finalizado', 1: 'Detenido' });
      await documento(x.id, 'por_confirmar', '2026-11-03T10:00:00-05:00', muchos);
      await compromiso(x.porPaso[1], '2026-11-20');
    }
    const proto = Object.getPrototypeOf(ctx.ds.createQueryRunner());
    const espia = jest.spyOn(proto, 'query');
    await dashboard(pocos);
    const conUno = espia.mock.calls.length;
    espia.mockClear();
    const grande = await dashboard(muchos);
    const conDoce = espia.mock.calls.length;
    espia.mockRestore();
    expect(grande.resumen.clientes_activos).toBe(12);
    expect(grande.avance_por_cliente).toHaveLength(12);
    expect(conUno).toBeGreaterThan(0);
    expect(conUno).toBeLessThanOrEqual(8);
    expect(conDoce).toBe(conUno);
  });

  it('CP-170 avance_por_cliente (asesor): solo clientes activos propios, ordenados por nombre, con las 16 etapas en orden', async () => {
    const d = await dashboard(asesor);
    const lista = d.avance_por_cliente!;
    expect(d.total_avance_por_cliente).toBe(7);
    expect(lista).toHaveLength(7);
    const ids = lista.map((x) => x.cliente_id);
    expect(ids).not.toContain(c.pensionado);
    expect(ids.sort()).toEqual(
      [c.enProceso, c.bloqueada, c.detenida, c.porIniciar, c.final, c.quince, c.catorce].sort(),
    );
    // Orden por cliente_nombre (y id si empatan).
    const original = (await dashboard(asesor)).avance_por_cliente!;
    const esperado = [...original].sort(
      (a, b) =>
        (a.cliente_nombre < b.cliente_nombre ? -1 : a.cliente_nombre > b.cliente_nombre ? 1 : 0) ||
        (a.cliente_id < b.cliente_id ? -1 : 1),
    );
    expect(original.map((x) => x.cliente_id)).toEqual(esperado.map((x) => x.cliente_id));

    const enProceso = lista.find((x) => x.cliente_id === c.enProceso)!;
    expect(enProceso.cliente_nombre).toBe(nombres[c.enProceso]);
    expect(enProceso.etapas).toHaveLength(16);
    expect(enProceso.etapas.map((e) => e.numero_paso)).toEqual(
      Array.from({ length: 16 }, (_, i) => i),
    );
    // Etapas 0 (Finalizado), 1 (En proceso asesor) y 2 (Por iniciar) sembradas con avance 50; el resto sin fila.
    expect(enProceso.etapas.slice(0, 4)).toEqual([
      { numero_paso: 0, avance_porcentaje: 50, estatus_id: ID_ESTATUS.Finalizado },
      { numero_paso: 1, avance_porcentaje: 50, estatus_id: ID_ESTATUS['En proceso asesor'] },
      { numero_paso: 2, avance_porcentaje: 50, estatus_id: ID_ESTATUS['Por iniciar'] },
      { numero_paso: 3, avance_porcentaje: 0, estatus_id: null },
    ]);
    // `limite` no recorta esta lista.
    expect((await dashboard(asesor, '?limite=1')).avance_por_cliente).toHaveLength(7);
  });

  it('CP-171 un cliente sin etapas devuelve las 16 con avance 0 y estatus_id null', async () => {
    const dueno = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const id = await insertarCliente(ctx.ds, catalogo, dueno.id);
    const d = await dashboard(dueno);
    expect(d.avance_por_cliente).toHaveLength(1);
    expect(d.avance_por_cliente![0].cliente_id).toBe(id);
    expect(d.avance_por_cliente![0].etapas).toEqual(
      Array.from({ length: 16 }, (_, i) => ({
        numero_paso: i,
        avance_porcentaje: 0,
        estatus_id: null,
      })),
    );
  });

  it('CP-172 tope de 200 clientes con total_avance_por_cliente completo', async () => {
    const dueno = await crearUsuarioPrueba(ctx.ds, 'asesor');
    for (let i = 0; i < 205; i++) await insertarCliente(ctx.ds, catalogo, dueno.id);
    const d = await dashboard(dueno);
    expect(d.avance_por_cliente).toHaveLength(200);
    expect(d.total_avance_por_cliente).toBe(205);
    expect(d.resumen.clientes_activos).toBe(205);
    expect(d.avance_por_cliente!.every((x) => x.etapas.length === 16)).toBe(true);
  });

  it('CP-173 avance_por_cliente es null para el auxiliar y el supervisor', async () => {
    for (const quien of [auxiliar, supervisor]) {
      const d = await dashboard(quien);
      expect(d.avance_por_cliente).toBeNull();
      expect(d.total_avance_por_cliente).toBeNull();
    }
  });
});
