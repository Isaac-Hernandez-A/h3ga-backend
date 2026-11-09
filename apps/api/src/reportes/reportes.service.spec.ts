import { ForbiddenException } from '@nestjs/common';
import { Reloj } from '../common/fechas';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  fijarCompromiso,
  ID_ESTATUS,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCambioDeEstatus,
  insertarCliente,
  insertarEtapa,
  limpiarDatosClientes,
  marcarFinalizada,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { ReporteOperativo } from './reporte-operativo';
import { ReportesModule } from './reportes.module';
import { ReportesService } from './reportes.service';

// Reporte operativo contra la base de pruebas real, con la hora fijada por el Reloj. Cada prueba usa asesores
// propios para que sus conteos no dependan de lo que otras suites hayan dejado en la misma base.
jest.setTimeout(120_000);

// Hoy = miércoles 11 de noviembre de 2026, 12:00 en Cancún. Semana: 9 a 15 de noviembre; mes: noviembre.
const HOY = new Date('2026-11-11T12:00:00-05:00');
const SEMANAL = { periodo: 'semanal' as const };
const ESTATUS_9 = [
  'No aplica',
  'Por iniciar',
  'En proceso cliente',
  'En proceso asesor',
  'En proceso Instituto',
  'Finalizado',
  'Bloqueado',
  'Cancelado',
  'Detenido',
];

describeConBd('ReportesService.generar (base de pruebas)', () => {
  let ctx: AppConBd;
  let servicio: ReportesService;
  let reloj: Reloj;
  let catalogo: IdsCatalogo;
  let regimenes: number[];
  let supervisor: UsuarioPrueba;

  const usuario = (u: UsuarioPrueba) => ({ sub: u.id, rol: u.rol });
  const nuevoAsesor = () => crearUsuarioPrueba(ctx.ds, 'asesor');
  const clienteDe = (u: UsuarioPrueba, extra: object = {}) =>
    insertarCliente(ctx.ds, catalogo, u.id, extra);
  const reporte = (u: UsuarioPrueba, entrada: { periodo: 'semanal' | 'mensual'; fecha?: string }) =>
    servicio.generar(usuario(u), entrada);
  const celda = (r: ReporteOperativo, paso: number, estatus: string) =>
    r.cartera.etapas.find((e) => e.numero_paso === paso)!.por_estatus[estatus];

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    servicio = ctx.app.get(ReportesService);
    // strict: el Reloj de ESTE módulo (AvisosModule también tiene uno y, sin strict, get() podría devolver ese).
    reloj = ctx.app.select(ReportesModule).get(Reloj, { strict: true });
    catalogo = await idsDeCatalogo(ctx.ds);
    regimenes = (
      await ctx.ds.query<{ id: number }[]>('SELECT id FROM regimen_principal ORDER BY id LIMIT 3')
    ).map((r) => r.id);
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
  });

  beforeEach(() => {
    jest.spyOn(reloj, 'ahora').mockReturnValue(HOY);
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-57 el asesor recibe solo métricas de sus clientes; el supervisor las de todos; el auxiliar recibe 403', async () => {
    const a = await nuevoAsesor();
    const b = await nuevoAsesor();
    const auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    const cA = await clienteDe(a);
    const cB = await clienteDe(b);
    await insertarEtapa(ctx.ds, cA, 0, ID_ESTATUS['Por iniciar'], 10);
    await insertarEtapa(ctx.ds, cA, 1, ID_ESTATUS['Por iniciar'], 10);
    await insertarEtapa(ctx.ds, cB, 0, ID_ESTATUS['Por iniciar'], 10);

    const rA = await reporte(a, SEMANAL);
    const rB = await reporte(b, SEMANAL);
    const rS = await reporte(supervisor, SEMANAL);
    expect(rA.cartera.etapas.reduce((n, e) => n + e.total, 0)).toBe(2);
    expect(rB.cartera.etapas.reduce((n, e) => n + e.total, 0)).toBe(1);
    // El supervisor ve al menos lo de ambos (la base puede traer más datos de otras suites).
    expect(rS.cartera.etapas.reduce((n, e) => n + e.total, 0)).toBeGreaterThanOrEqual(3);
    expect(rA.alcance).toBe('asesor');
    expect(rS.alcance).toBe('supervisor');

    await expect(reporte(auxiliar, SEMANAL)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('CP-58 la matriz etapa por estatus cuenta correctamente con datos sembrados y solo incluye las etapas 0 a 4', async () => {
    const a = await nuevoAsesor();
    const c1 = await clienteDe(a);
    const c2 = await clienteDe(a);
    await insertarEtapa(ctx.ds, c1, 0, ID_ESTATUS['Por iniciar'], 10);
    await insertarEtapa(ctx.ds, c2, 0, ID_ESTATUS['Por iniciar'], 10);
    await insertarEtapa(ctx.ds, c1, 1, ID_ESTATUS['En proceso asesor'], 40);
    await insertarEtapa(ctx.ds, c1, 2, ID_ESTATUS.Bloqueado, 40);
    await insertarEtapa(ctx.ds, c2, 2, ID_ESTATUS['No aplica'], 0);
    await insertarEtapa(ctx.ds, c1, 4, ID_ESTATUS.Finalizado, 100);
    // Etapas fuera de F0 a F4: no deben aparecer.
    await insertarEtapa(ctx.ds, c1, 5, ID_ESTATUS['Por iniciar'], 10);
    await insertarEtapa(ctx.ds, c1, 15, ID_ESTATUS['Por iniciar'], 10);

    const r = await reporte(a, SEMANAL);
    expect(r.cartera.estatus).toEqual(ESTATUS_9);
    expect(r.cartera.etapas.map((e) => e.numero_paso)).toEqual([0, 1, 2, 3, 4]);
    expect(r.cartera.etapas[0].nombre).toBe('Diagnóstico inicial');
    expect(celda(r, 0, 'Por iniciar')).toBe(2);
    expect(celda(r, 1, 'En proceso asesor')).toBe(1);
    expect(celda(r, 2, 'Bloqueado')).toBe(1);
    expect(celda(r, 2, 'No aplica')).toBe(1);
    expect(celda(r, 3, 'Por iniciar')).toBe(0);
    expect(celda(r, 4, 'Finalizado')).toBe(1);
    expect(r.cartera.etapas.map((e) => e.total)).toEqual([2, 1, 2, 0, 1]);
    // Todas las columnas existen aunque valgan cero.
    expect(Object.keys(r.cartera.etapas[3].por_estatus)).toEqual(ESTATUS_9);
  });

  it('CP-59 finalizados del periodo incluye los límites del rango y excluye lo de fuera', async () => {
    const a = await nuevoAsesor();
    const c = await clienteDe(a, { nombre: 'Cliente', apellido_paterno: 'Finalizado' });
    const en = async (paso: number, fecha: string) => {
      const id = await insertarEtapa(ctx.ds, c, paso, ID_ESTATUS['Por iniciar'], 10);
      await marcarFinalizada(ctx.ds, id, fecha);
      return id;
    };
    await en(0, '2026-11-09'); // primer día de la semana: entra
    await en(1, '2026-11-15'); // último día: entra
    await en(2, '2026-11-12'); // dentro
    await en(3, '2026-11-08'); // un día antes: fuera
    await en(4, '2026-11-16'); // un día después: fuera
    await en(5, '2026-11-10'); // etapa 5: fuera de F0 a F4
    // Con fecha de término en rango pero que ya no está finalizada (se reabrió): no cuenta.
    const otro = await clienteDe(a);
    const reabierta = await insertarEtapa(ctx.ds, otro, 0, ID_ESTATUS['En proceso asesor'], 50);
    await ctx.ds.query("UPDATE etapas_tramite SET fecha_completada = '2026-11-10' WHERE id = $1", [
      reabierta,
    ]);

    const semanal = await reporte(a, SEMANAL);
    expect(semanal.finalizados.total).toBe(3);
    expect(semanal.finalizados.lista.map((f) => f.fecha_completada).sort()).toEqual([
      '2026-11-09',
      '2026-11-12',
      '2026-11-15',
    ]);
    expect(semanal.finalizados.lista[0]).toMatchObject({
      cliente: expect.stringContaining('Finalizado'),
    });
    expect(semanal.desde).toBe('2026-11-09');
    expect(semanal.hasta).toBe('2026-11-15');

    // Mensual (noviembre): entran también el 8 y el 16 (pero sigue sin entrar la etapa 5).
    const mensual = await reporte(a, { periodo: 'mensual' });
    expect(mensual.finalizados.total).toBe(5);
    // La fecha de referencia manda sobre "hoy": la semana del 2 al 8 solo trae la del día 8.
    const anterior = await reporte(a, { periodo: 'semanal', fecha: '2026-11-04' });
    expect(anterior.desde).toBe('2026-11-02');
    expect(anterior.finalizados.total).toBe(1);
  });

  it('CP-60 vencidos y por vencer respecto a un reloj fijo; excluye Finalizado, Cancelado y No aplica', async () => {
    const a = await nuevoAsesor();
    const c = await clienteDe(a, { nombre: 'Cliente', apellido_paterno: 'Vence' });
    const etapa = async (paso: number, estatus: number, fecha: string) => {
      const id = await insertarEtapa(ctx.ds, c, paso, estatus, 40);
      await fijarCompromiso(ctx.ds, id, fecha);
    };
    await etapa(0, ID_ESTATUS['En proceso asesor'], '2026-11-10'); // ayer: vencido
    await etapa(1, ID_ESTATUS['Por iniciar'], '2026-11-01'); // vencido hace días
    await etapa(2, ID_ESTATUS['En proceso cliente'], '2026-11-11'); // hoy: por vencer
    await etapa(3, ID_ESTATUS.Bloqueado, '2026-11-13'); // hoy + 2: por vencer
    await etapa(4, ID_ESTATUS['En proceso asesor'], '2026-11-14'); // hoy + 3: aún no
    const c2 = await clienteDe(a);
    for (const [paso, estatus] of [
      [0, ID_ESTATUS.Finalizado],
      [1, ID_ESTATUS.Cancelado],
      [2, ID_ESTATUS['No aplica']],
    ] as const) {
      const id = await insertarEtapa(ctx.ds, c2, paso, estatus, 40);
      await fijarCompromiso(ctx.ds, id, '2026-11-10'); // excluidos aunque estén vencidos
    }
    const idFuera = await insertarEtapa(ctx.ds, c2, 5, ID_ESTATUS['En proceso asesor'], 40);
    await fijarCompromiso(ctx.ds, idFuera, '2026-11-10'); // etapa 5: fuera de F0 a F4

    const r = await reporte(a, SEMANAL);
    expect(r.vencimientos.vencidos).toBe(2);
    expect(r.vencimientos.por_vencer).toBe(2);
    // La lista va de lo más atrasado a lo más cercano e indica cliente, etapa, fecha y situación.
    expect(r.vencimientos.lista.map((v) => [v.fecha_compromiso, v.situacion])).toEqual([
      ['2026-11-01', 'vencido'],
      ['2026-11-10', 'vencido'],
      ['2026-11-11', 'por_vencer'],
      ['2026-11-13', 'por_vencer'],
    ]);
    expect(r.vencimientos.lista[0]).toMatchObject({
      cliente: expect.stringContaining('Vence'),
      etapa: 'Diagnóstico especializado',
      numero_paso: 1,
    });

    // Un día después el reloj cambia el resultado: lo de hoy pasa a vencido.
    jest.spyOn(reloj, 'ahora').mockReturnValue(new Date('2026-11-12T08:00:00-05:00'));
    const manana = await reporte(a, SEMANAL);
    expect(manana.vencimientos.vencidos).toBe(3);
    expect(manana.vencimientos.por_vencer).toBe(2); // 13 (hoy+1) y 14 (hoy+2)
  });

  it('CP-60b la lista de vencimientos es corta (10) pero los conteos son completos', async () => {
    const a = await nuevoAsesor();
    for (let i = 0; i < 12; i++) {
      const c = await clienteDe(a);
      const id = await insertarEtapa(ctx.ds, c, 0, ID_ESTATUS['Por iniciar'], 10);
      await fijarCompromiso(ctx.ds, id, '2026-11-05');
    }
    const r = await reporte(a, SEMANAL);
    expect(r.vencimientos.vencidos).toBe(12);
    expect(r.vencimientos.lista).toHaveLength(10);
  });

  it('CP-61 tasa de rechazo = bloqueos con motivo / etapas con cambios; 0 cuando no hay cambios (sin dividir entre cero)', async () => {
    const a = await nuevoAsesor();
    const c = await clienteDe(a);
    const etapas = [
      await insertarEtapa(ctx.ds, c, 0, ID_ESTATUS.Bloqueado, 40),
      await insertarEtapa(ctx.ds, c, 1, ID_ESTATUS.Bloqueado, 40),
      await insertarEtapa(ctx.ds, c, 2, ID_ESTATUS.Bloqueado, 40),
      await insertarEtapa(ctx.ds, c, 3, ID_ESTATUS['En proceso asesor'], 40),
    ];
    const dentro = '2026-11-10T12:00:00-05:00';
    const bloquear = (i: number, motivo: string | null, cuando = dentro) =>
      insertarCambioDeEstatus(
        ctx.ds,
        etapas[i],
        ID_ESTATUS['En proceso asesor'],
        ID_ESTATUS.Bloqueado,
        motivo,
        a.id,
        cuando,
      );
    await bloquear(0, 'Error en acta');
    await bloquear(1, 'Error en acta');
    await bloquear(2, null); // bloqueo sin motivo: no cuenta como rechazo, pero su etapa sí tuvo cambios
    await insertarCambioDeEstatus(
      ctx.ds,
      etapas[3],
      ID_ESTATUS['Por iniciar'],
      ID_ESTATUS['En proceso asesor'],
      null,
      a.id,
      dentro,
    );
    // Fuera del periodo (un instante antes y uno después): no cuentan.
    await bloquear(3, 'Fuera de periodo', '2026-11-08T23:59:59-05:00');
    await bloquear(3, 'Fuera de periodo', '2026-11-16T00:00:00-05:00');

    const r = await reporte(a, SEMANAL);
    expect(r.rechazo.etapas_con_cambios).toBe(4);
    expect(r.rechazo.bloqueos).toBe(2);
    expect(r.rechazo.tasa).toBe(0.5);
    expect(r.rechazo.motivos).toEqual([{ motivo: 'Error en acta', total: 2 }]);

    // Sin cambios en el periodo: 0, sin NaN ni división entre cero.
    const vacio = await reporte(await nuevoAsesor(), SEMANAL);
    expect(vacio.rechazo).toEqual({ tasa: 0, bloqueos: 0, etapas_con_cambios: 0, motivos: [] });
  });

  it('CP-61b los motivos se ordenan por frecuencia y se limitan a los 5 más frecuentes', async () => {
    const a = await nuevoAsesor();
    const c = await clienteDe(a);
    const dentro = '2026-11-10T12:00:00-05:00';
    const etapas: string[] = [];
    for (let paso = 0; paso < 5; paso++) {
      etapas.push(await insertarEtapa(ctx.ds, c, paso, ID_ESTATUS.Bloqueado, 40));
    }
    const motivos = ['M1', 'M1', 'M1', 'M2', 'M2', 'M3', 'M4', 'M5', 'M6'];
    for (const [i, motivo] of motivos.entries()) {
      await insertarCambioDeEstatus(
        ctx.ds,
        etapas[i % 5],
        ID_ESTATUS['En proceso asesor'],
        ID_ESTATUS.Bloqueado,
        motivo,
        a.id,
        dentro,
      );
    }
    const r = await reporte(a, SEMANAL);
    expect(r.rechazo.motivos).toHaveLength(5);
    expect(r.rechazo.motivos.slice(0, 2)).toEqual([
      { motivo: 'M1', total: 3 },
      { motivo: 'M2', total: 2 },
    ]);
  });

  it('CP-62 el desglose por asesor solo aparece para el supervisor', async () => {
    const a = await nuevoAsesor();
    const b = await nuevoAsesor();
    const cA = await clienteDe(a);
    const cB = await clienteDe(b);
    await insertarEtapa(ctx.ds, cA, 0, ID_ESTATUS.Finalizado, 100);
    await insertarEtapa(ctx.ds, cA, 1, ID_ESTATUS['En proceso asesor'], 40);
    await insertarEtapa(ctx.ds, cA, 2, ID_ESTATUS['No aplica'], 0); // no cuenta en el promedio
    await insertarEtapa(ctx.ds, cA, 6, ID_ESTATUS['Por iniciar'], 10); // fuera de F0 a F4
    await insertarEtapa(ctx.ds, cB, 0, ID_ESTATUS['Por iniciar'], 10);

    const delAsesor = await reporte(a, SEMANAL);
    expect(delAsesor.por_asesor).toBeUndefined();

    const delSupervisor = await reporte(supervisor, SEMANAL);
    expect(Array.isArray(delSupervisor.por_asesor)).toBe(true);
    const fila = (id: string) => delSupervisor.por_asesor!.find((x) => x.asesor_id === id)!;
    expect(fila(a.id)).toMatchObject({ clientes: 1, avance_promedio: 70 }); // (100 + 40) / 2
    expect(fila(b.id)).toMatchObject({ clientes: 1, avance_promedio: 10 });
    expect(fila(a.id).asesor).toContain('Prueba');
  });

  it('CP-63 clientes nuevos y distribución por régimen respetan el periodo y el alcance', async () => {
    const a = await nuevoAsesor();
    const b = await nuevoAsesor();
    const nuevo = (u: UsuarioPrueba, fecha: string, regimen: number) =>
      clienteDe(u, { fecha_ingreso: fecha, regimen_id: regimen });
    await nuevo(a, '2026-11-09', regimenes[0]); // primer día: entra
    await nuevo(a, '2026-11-15', regimenes[0]); // último día: entra
    await nuevo(a, '2026-11-12', regimenes[1]);
    await nuevo(a, '2026-11-08', regimenes[2]); // antes del rango: fuera
    await nuevo(a, '2026-11-16', regimenes[2]); // después: fuera
    await nuevo(b, '2026-11-10', regimenes[2]); // de otro asesor: fuera para a

    const rA = await reporte(a, SEMANAL);
    expect(rA.clientes_nuevos.total).toBe(3);
    const nombres = await ctx.ds.query<{ id: number; nombre: string }[]>(
      'SELECT id, nombre FROM regimen_principal WHERE id = ANY($1)',
      [regimenes],
    );
    const nombre = (id: number) => nombres.find((n) => n.id === id)!.nombre;
    expect(rA.clientes_nuevos.por_regimen).toEqual([
      { regimen: nombre(regimenes[0]), total: 2 },
      { regimen: nombre(regimenes[1]), total: 1 },
    ]);

    const rB = await reporte(b, SEMANAL);
    expect(rB.clientes_nuevos.total).toBe(1);
    // Mensual: entran también el 8 y el 16 de a.
    expect((await reporte(a, { periodo: 'mensual' })).clientes_nuevos.total).toBe(5);
  });

  it('un periodo sin datos devuelve ceros y listas vacías (sin errores)', async () => {
    const r = await reporte(await nuevoAsesor(), { periodo: 'mensual', fecha: '2026-02-10' });
    expect(r.desde).toBe('2026-02-01');
    expect(r.hasta).toBe('2026-02-28');
    expect(r.cartera.etapas.every((e) => e.total === 0)).toBe(true);
    expect(r.finalizados).toEqual({ total: 0, lista: [] });
    expect(r.vencimientos).toEqual({ vencidos: 0, por_vencer: 0, lista: [] });
    expect(r.clientes_nuevos).toEqual({ total: 0, por_regimen: [] });
  });
});
