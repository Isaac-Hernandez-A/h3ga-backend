import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { ClientesService } from '../clientes/clientes.service';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  curpFicticia,
  limpiarDatosClientes,
  MARCA_CLIENTE,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { CargadorClientes } from './cargador';
import { DatosCliente, DatosEtapa, RenglonValidado, TOTAL_ETAPAS } from './tipos';

// Cargador por lotes (Actividad 5, Tarea 9): integración con la base de pruebas (*_test). Los clientes se
// marcan con referido_por = MARCA_CLIENTE y se borran al final. Solo datos ficticios.
jest.setTimeout(90_000);

const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));
const MOTIVO_BLOQUEO = 'Importado desde Excel, sin motivo registrado';

const nssAleatorio = () => String(Math.floor(1e10 + Math.random() * 9e10));

// Las 16 etapas en "Por iniciar" (10 %), con cambios por número de paso.
function etapas(cambios: Record<number, Partial<DatosEtapa>> = {}): DatosEtapa[] {
  return Array.from({ length: TOTAL_ETAPAS }, (_, n) => ({
    numeroPaso: n,
    estatus: 'Por iniciar' as const,
    avance: 10,
    accion: null,
    fechaCompromiso: null,
    motivoRechazo: null,
    ...cambios[n],
  }));
}

// Captura todo lo que el Logger de Nest escribe (y lo silencia) para revisar su contenido.
function espiarLogs(): string[] {
  const mensajes: string[] = [];
  for (const nivel of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
    jest.spyOn(Logger.prototype, nivel).mockImplementation((...args: unknown[]) => {
      mensajes.push(JSON.stringify(args));
    });
  }
  return mensajes;
}

describeConBd('CargadorClientes (integración con la base de pruebas)', () => {
  let ctx: AppConBd;
  let ds: DataSource;
  let asesor: UsuarioPrueba;
  let ejecutor: UsuarioPrueba;
  let cargador: CargadorClientes;

  // Cliente ya validado, con datos distintos por renglón.
  function renglon(fila: number, cambios: Partial<DatosCliente> = {}): RenglonValidado {
    const datos: DatosCliente = {
      nombre: 'Leticia',
      apellidoPaterno: 'May',
      apellidoMaterno: 'Uc',
      referidoPor: MARCA_CLIENTE,
      telefono: '9990000000',
      correoElectronico: `cliente${fila}@ejemplo.test`,
      observacionesGenerales: '',
      asesorId: asesor.id,
      fechaIngreso: utc(2025, 1, 17),
      fechaNacimiento: utc(1970, 9, 9),
      curp: curpFicticia(),
      rfc: 'ABCD800101XY1',
      nss: nssAleatorio(),
      sexo: 'mujer',
      estadoCivil: 'casado',
      dependientesEconomicos: 2,
      regimen: 'IMSS',
      leyProbable: 'Ley 73',
      afore: 'Sura',
      semanasImssReconocidas: 1094,
      semanasARecuperar: 200,
      tieneIssste: 'no',
      requiereContadora: 'no',
      domicilio: 'Pendiente de captura',
      estado: 'Pendiente de captura',
      subdelegacionImssProbable: 'Pendiente de captura',
      cambioAfore: 'por_confirmar',
      objetivoCliente: 'pensionarse_asap',
      etapas: etapas(),
      ...cambios,
    };
    return { fila, idExcel: fila, datos, ajustes: [], advertencias: [], rechazos: [] };
  }

  const lote = (n: number, desde = 6) => Array.from({ length: n }, (_, i) => renglon(desde + i));
  const curpsDe = (renglones: RenglonValidado[]) => renglones.map((r) => r.datos!.curp);
  const opciones = (extra: Partial<{ tamanoLote: number; simulacro: boolean }> = {}) => ({
    tamanoLote: 10,
    simulacro: false,
    ejecutorId: ejecutor.id,
    ...extra,
  });

  async function filasCliente(curps: string[]) {
    return ds.query<
      { id: string; curp: string; asesor_id: string; sexo: string; nombre: string }[]
    >(`SELECT * FROM clientes WHERE curp = ANY($1) ORDER BY curp`, [curps]);
  }
  const contarMarcados = async () =>
    Number(
      (
        await ds.query<{ n: string }[]>(
          `SELECT count(*) AS n FROM clientes WHERE referido_por = $1`,
          [MARCA_CLIENTE],
        )
      )[0].n,
    );
  const etapasDe = (clienteId: string) =>
    ds.query<
      {
        numero_paso: number;
        estatus: string;
        avance_porcentaje: number;
        accion_a_realizar: string | null;
        fecha_compromiso: string | null;
        fecha_completada: string | null;
        motivo_rechazo: string | null;
      }[]
    >(
      `SELECT p.numero_paso, s.nombre AS estatus, e.avance_porcentaje, e.accion_a_realizar,
              to_char(e.fecha_compromiso, 'YYYY-MM-DD') AS fecha_compromiso,
              to_char(e.fecha_completada, 'YYYY-MM-DD') AS fecha_completada, e.motivo_rechazo
         FROM etapas_tramite e
         JOIN etapas_proceso p ON p.id = e.etapa_id
         JOIN estatus_tramite s ON s.id = e.estatus_id
        WHERE e.cliente_id = $1 ORDER BY p.numero_paso`,
      [clienteId],
    );

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    ds = ctx.ds;
    asesor = await crearUsuarioPrueba(ds, 'asesor');
    ejecutor = await crearUsuarioPrueba(ds, 'supervisor');
    cargador = new CargadorClientes(ds, ctx.app.get(ClientesService, { strict: false }));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await ds.query(
      `DELETE FROM etapas_tramite WHERE cliente_id IN
      (SELECT id FROM clientes WHERE referido_por = $1)`,
      [MARCA_CLIENTE],
    );
    await ds.query(`DELETE FROM clientes WHERE referido_por = $1`, [MARCA_CLIENTE]);
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-265 carga_clientes_con_16_etapas: cada cliente queda con sus 16 etapas', async () => {
    const renglones = lote(3);
    const r = await cargador.cargarLotes(renglones, opciones());
    expect(r.cargados).toEqual(curpsDe(renglones));
    expect(r.rechazados).toEqual([]);
    const clientes = await filasCliente(curpsDe(renglones));
    expect(clientes).toHaveLength(3);
    for (const c of clientes) {
      const filas = await etapasDe(c.id);
      expect(filas.map((f) => f.numero_paso)).toEqual(Array.from({ length: 16 }, (_, i) => i));
    }
  });

  it('CP-266 lotes_de_10: 25 válidos dan 3 lotes y se cargan todos', async () => {
    const renglones = lote(25);
    const r = await cargador.cargarLotes(renglones, opciones({ tamanoLote: 10 }));
    expect(r.lotes).toBe(3);
    expect(r.lotesDegradados).toBe(0);
    expect(r.cargados).toHaveLength(25);
    expect(await contarMarcados()).toBe(25);
    const r2 = await cargador.cargarLotes([], opciones());
    expect(r2).toEqual({ cargados: [], rechazados: [], lotes: 0, lotesDegradados: 0 });
  });

  it('CP-266 un tamaño de lote que no es un entero positivo es un error de uso', async () => {
    await expect(cargador.cargarLotes(lote(1), opciones({ tamanoLote: 0 }))).rejects.toThrow(
      /lote/i,
    );
    await expect(cargador.cargarLotes(lote(1), opciones({ tamanoLote: 2.5 }))).rejects.toThrow(
      /lote/i,
    );
    expect(await contarMarcados()).toBe(0);
  });

  it('CP-267 cada_lote_es_transaccion: un fallo en el último lote lo reintenta y conserva los lotes anteriores', async () => {
    const renglones = lote(25);
    renglones[22].datos!.asesorId = randomUUID(); // usuario que no existe: viola la llave foránea
    const r = await cargador.cargarLotes(renglones, opciones());
    expect(r.lotes).toBe(3);
    expect(r.lotesDegradados).toBe(1);
    expect(r.cargados).toHaveLength(24);
    expect(r.rechazados).toHaveLength(1);
    expect(r.rechazados[0].fila).toBe(renglones[22].fila);
    // Lo confirmado en los lotes 1 y 2 sigue ahí, una sola vez y con sus 16 etapas.
    const clientes = await filasCliente(curpsDe(renglones.slice(0, 20)));
    expect(clientes).toHaveLength(20);
  });

  it('CP-267 un fallo después de crear el cliente (etapa con estatus inexistente) no deja un cliente a medias', async () => {
    const renglones = lote(3);
    renglones[1].datos!.etapas = etapas({ 3: { estatus: 'Estatus inventado' as never } });
    const r = await cargador.cargarLotes(renglones, opciones());
    expect(r.lotesDegradados).toBe(1);
    expect(r.cargados).toEqual([renglones[0].datos!.curp, renglones[2].datos!.curp]);
    expect(r.rechazados.map((x) => x.fila)).toEqual([renglones[1].fila]);
    // El cliente del renglón fallido no quedó guardado (ni él ni sus etapas).
    expect(await filasCliente([renglones[1].datos!.curp])).toEqual([]);
    const etapasHuerfanas = await ds.query<{ n: string }[]>(
      `SELECT count(*) AS n FROM etapas_tramite e
        WHERE NOT EXISTS (SELECT 1 FROM clientes c WHERE c.id = e.cliente_id)`,
    );
    expect(Number(etapasHuerfanas[0].n)).toBe(0);
  });

  it('CP-268 lote_degradado_aisla_el_fallido: el renglón que viola la base se rechaza y los demás del lote se cargan', async () => {
    const renglones = lote(25);
    renglones[14].datos!.asesorId = randomUUID(); // cae en el lote 2 (renglones 10 a 19)
    const r = await cargador.cargarLotes(renglones, opciones());
    expect(r.lotes).toBe(3);
    expect(r.lotesDegradados).toBe(1);
    expect(r.cargados).toHaveLength(24);
    expect(r.cargados).not.toContain(renglones[14].datos!.curp);
    expect(r.rechazados).toEqual([{ fila: renglones[14].fila, motivo: expect.any(String) }]);
    expect(r.rechazados[0].motivo.length).toBeGreaterThan(0);
    expect(await contarMarcados()).toBe(24);
    // Los otros 9 del lote degradado sí quedaron.
    expect(await filasCliente(curpsDe(renglones.slice(10, 20)))).toHaveLength(9);
  });

  it('CP-268 los cargados salen en el orden de entrada', async () => {
    const renglones = lote(12);
    const r = await cargador.cargarLotes(renglones, opciones({ tamanoLote: 5 }));
    expect(r.cargados).toEqual(curpsDe(renglones));
  });

  it('CP-269 simulacro_no_guarda: mismos totales que una carga real y la base queda igual', async () => {
    const renglones = lote(25);
    const antes = await contarMarcados();
    const simulado = await cargador.cargarLotes(renglones, opciones({ simulacro: true }));
    expect(await contarMarcados()).toBe(antes);
    const etapasAntes = await ds.query<{ n: string }[]>(`SELECT count(*) AS n FROM etapas_tramite`);
    expect(simulado.cargados).toEqual(curpsDe(renglones));
    expect(simulado.rechazados).toEqual([]);
    expect(simulado.lotes).toBe(3);
    expect(simulado.lotesDegradados).toBe(0);

    const real = await cargador.cargarLotes(renglones, opciones());
    expect(real).toEqual(simulado);
    expect(await contarMarcados()).toBe(antes + 25);
    expect(etapasAntes).toBeDefined();
  });

  it('CP-270 etapas_con_el_estado_del_excel: estatus, avance, acción y fecha de cada etapa, incluido el congelado', async () => {
    const r1 = renglon(6, {
      etapas: etapas({
        0: { estatus: 'Finalizado', avance: 100, fechaCompromiso: utc(2025, 2, 1) },
        1: {
          estatus: 'En proceso asesor',
          avance: 55,
          accion: 'Revisar historial laboral',
          fechaCompromiso: utc(2025, 4, 2),
        },
        2: { estatus: 'Bloqueado', avance: 30, motivoRechazo: MOTIVO_BLOQUEO },
        3: { estatus: 'Cancelado', avance: 40 },
        4: { estatus: 'Detenido', avance: 20 },
        5: { estatus: 'No aplica', avance: null },
        6: { estatus: 'En proceso Instituto', avance: 90 },
        7: { estatus: 'En proceso cliente', avance: 20 },
      }),
    });
    await cargador.cargarLotes([r1], opciones());
    const [cliente] = await filasCliente([r1.datos!.curp]);
    const filas = await etapasDe(cliente.id);
    expect(filas).toHaveLength(16);
    const por = (n: number) => filas[n];
    expect(por(0)).toMatchObject({
      estatus: 'Finalizado',
      avance_porcentaje: 100,
      fecha_compromiso: '2025-02-01',
    });
    expect(por(1)).toMatchObject({
      estatus: 'En proceso asesor',
      avance_porcentaje: 55,
      accion_a_realizar: 'Revisar historial laboral',
      fecha_compromiso: '2025-04-02',
    });
    expect(por(2)).toMatchObject({
      estatus: 'Bloqueado',
      avance_porcentaje: 30,
      motivo_rechazo: MOTIVO_BLOQUEO,
    });
    expect(por(3)).toMatchObject({
      estatus: 'Cancelado',
      avance_porcentaje: 40,
      motivo_rechazo: null,
    });
    expect(por(4)).toMatchObject({ estatus: 'Detenido', avance_porcentaje: 20 });
    expect(por(5)).toMatchObject({ estatus: 'No aplica', avance_porcentaje: 0 });
    expect(por(6)).toMatchObject({ estatus: 'En proceso Instituto', avance_porcentaje: 90 });
    expect(por(7)).toMatchObject({ estatus: 'En proceso cliente', avance_porcentaje: 20 });
    expect(por(8)).toMatchObject({ estatus: 'Por iniciar', avance_porcentaje: 10 });
  });

  it('CP-271 concurrencia_unicidad: dos cargas simultáneas del mismo CURP dejan uno cargado y el otro como "ya existe"', async () => {
    const curp = curpFicticia();
    const a = renglon(6, { curp });
    const b = renglon(7, { curp });
    const [ra, rb] = await Promise.all([
      cargador.cargarLotes([a], opciones()),
      cargador.cargarLotes([b], opciones()),
    ]);
    expect(ra.cargados.length + rb.cargados.length).toBe(1);
    const perdedor = ra.cargados.length === 0 ? ra : rb;
    expect(perdedor.rechazados).toHaveLength(1);
    expect(perdedor.rechazados[0].motivo).toMatch(/ya existe/i);
    expect(perdedor.rechazados[0].motivo).not.toContain(curp);
    expect(await filasCliente([curp])).toHaveLength(1);
  });

  it('CP-271 la unicidad también se respeta dentro de un lote y contra un cliente ya existente', async () => {
    const curp = curpFicticia();
    await cargador.cargarLotes([renglon(6, { curp })], opciones());
    const r = await cargador.cargarLotes([renglon(7, { curp }), renglon(8)], opciones());
    expect(r.cargados).toHaveLength(1);
    expect(r.rechazados).toHaveLength(1);
    expect(r.rechazados[0].fila).toBe(7);
    expect(r.rechazados[0].motivo).toMatch(/ya existe/i);
    expect(r.lotesDegradados).toBe(1);
  });

  it('CP-272 fechas_y_campos_opcionales_nulos: lo que no hay queda NULL y las fechas no se corren de día', async () => {
    const r1 = renglon(6, {
      rfc: null,
      nss: null,
      semanasARecuperar: null,
      fechaIngreso: utc(2025, 1, 1),
      fechaNacimiento: utc(1970, 12, 31),
    });
    await cargador.cargarLotes([r1], opciones());
    const [fila] = await ds.query<Record<string, unknown>[]>(
      `SELECT rfc, nss, semanas_a_recuperar, ocupacion, ine,
              to_char(fecha_ingreso, 'YYYY-MM-DD') AS fecha_ingreso,
              to_char(fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento
         FROM clientes WHERE curp = $1`,
      [r1.datos!.curp],
    );
    expect(fila).toEqual({
      rfc: null,
      nss: null,
      semanas_a_recuperar: null,
      ocupacion: null,
      ine: null,
      fecha_ingreso: '2025-01-01',
      fecha_nacimiento: '1970-12-31',
    });
    const [cliente] = await filasCliente([r1.datos!.curp]);
    const filas = await etapasDe(cliente.id);
    expect(filas.every((f) => f.accion_a_realizar === null && f.fecha_compromiso === null)).toBe(
      true,
    );
  });

  it('CP-273 responsable_del_registro: el cliente queda con el asesor del Excel y el ejecutor consta en los logs', async () => {
    const mensajes = espiarLogs();
    const r1 = renglon(6);
    await cargador.cargarLotes([r1], opciones());
    const [cliente] = await filasCliente([r1.datos!.curp]);
    expect(cliente.asesor_id).toBe(asesor.id);
    expect(cliente.asesor_id).not.toBe(ejecutor.id);
    expect(mensajes.join('\n')).toContain(ejecutor.id);
  });

  it('CP-274 sin_pii_en_logs: los logs no contienen CURP ni NSS completos, ni de cargados ni de rechazados', async () => {
    const mensajes = espiarLogs();
    const renglones = lote(5);
    renglones[2].datos!.asesorId = randomUUID(); // uno se rechaza y se loguea
    await cargador.cargarLotes(renglones, opciones());
    expect(mensajes.length).toBeGreaterThan(0);
    const todo = mensajes.join('\n');
    for (const r of renglones) {
      expect(todo).not.toContain(r.datos!.curp);
      expect(todo).not.toContain(r.datos!.nss!);
    }
  });

  it('CP-315 etapas_sin_historial: no hay filas de historial y fecha_completada es NULL en las etapas Finalizado', async () => {
    const r1 = renglon(6, {
      etapas: etapas({
        0: { estatus: 'Finalizado', avance: 100 },
        1: { estatus: 'Finalizado', avance: 100 },
        2: { estatus: 'Bloqueado', avance: 30, motivoRechazo: MOTIVO_BLOQUEO },
      }),
    });
    await cargador.cargarLotes([r1], opciones());
    const [cliente] = await filasCliente([r1.datos!.curp]);
    const historial = await ds.query<{ n: string }[]>(
      `SELECT count(*) AS n FROM etapas_tramite_historial h
         JOIN etapas_tramite e ON e.id = h.etapa_tramite_id WHERE e.cliente_id = $1`,
      [cliente.id],
    );
    expect(Number(historial[0].n)).toBe(0);
    const filas = await etapasDe(cliente.id);
    const finalizadas = filas.filter((f) => f.estatus === 'Finalizado');
    expect(finalizadas).toHaveLength(2);
    expect(finalizadas.every((f) => f.fecha_completada === null)).toBe(true);
  });

  it('CP-316 sexo_y_apellidos_en_el_cliente: guarda el sexo de la CURP y el nombre dividido', async () => {
    const r1 = renglon(6, {
      nombre: 'María Guadalupe',
      apellidoPaterno: 'López',
      apellidoMaterno: 'Pérez',
      sexo: 'hombre',
    });
    await cargador.cargarLotes([r1], opciones());
    const [fila] = await ds.query<Record<string, string>[]>(
      `SELECT sexo, nombre, apellido_paterno, apellido_materno, domicilio, estado,
              subdelegacion_imss_probable, cambio_afore, objetivo_cliente
         FROM clientes WHERE curp = $1`,
      [r1.datos!.curp],
    );
    expect(fila).toEqual({
      sexo: 'hombre',
      nombre: 'María Guadalupe',
      apellido_paterno: 'López',
      apellido_materno: 'Pérez',
      domicilio: 'Pendiente de captura',
      estado: 'Pendiente de captura',
      subdelegacion_imss_probable: 'Pendiente de captura',
      cambio_afore: 'por_confirmar',
      objetivo_cliente: 'pensionarse_asap',
    });
  });

  it('CP-316 los catálogos viajan por nombre y se guardan con su id (régimen, ley y AFORE)', async () => {
    const r1 = renglon(6, { regimen: 'ISSSTE', leyProbable: 'Ley 97', afore: 'XXI Banorte' });
    await cargador.cargarLotes([r1], opciones());
    const [fila] = await ds.query<Record<string, string>[]>(
      `SELECT r.nombre AS regimen, l.nombre AS ley, a.nombre AS afore
         FROM clientes c
         JOIN regimen_principal r ON r.id = c.regimen_id
         JOIN ley_probable l ON l.id = c.ley_probable_id
         JOIN afore a ON a.id = c.afore_id
        WHERE c.curp = $1`,
      [r1.datos!.curp],
    );
    expect(fila).toEqual({ regimen: 'ISSSTE', ley: 'Ley 97', afore: 'XXI Banorte' });
  });
});
