import { Reloj } from '../common/fechas';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
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
import { textoDePdf } from '../common/testing/texto-de-pdf';
import { tokenDe } from '../common/testing/tokens';
import { ReporteOperativo } from './reporte-operativo';
import { ReportesModule } from './reportes.module';

// Periodo trimestral y trazabilidad de etapas de GET /reportes y GET /reportes/pdf (aplicación real y base
// de pruebas). Hoy = miércoles 11/11/2026 12:00 en Cancún (trimestre octubre-diciembre).
jest.setTimeout(120_000);

describeConBd('Reporte operativo: trimestral y trazabilidad (aplicación real)', () => {
  let ctx: AppConBd;
  let reloj: Reloj;
  let catalogo: IdsCatalogo;
  let supervisor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

  const pedir = (ruta: string, u?: UsuarioPrueba) =>
    fetch(`${ctx.base}${ruta}`, { headers: u ? { Authorization: `Bearer ${t(u)}` } : {} });
  const reporte = async (u: UsuarioPrueba, consulta: string) => {
    const r = await pedir(`/reportes${consulta}`, u);
    expect(r.status).toBe(200);
    return (await r.json()) as ReporteOperativo;
  };
  const nuevoAsesor = async (nombre: string, apellido: string) => {
    const a = await crearUsuarioPrueba(ctx.ds, 'asesor');
    await ctx.ds.query(`UPDATE usuarios SET nombre = $2, apellido_paterno = $3 WHERE id = $1`, [
      a.id,
      nombre,
      apellido,
    ]);
    return a;
  };
  const cambio = (
    etapaId: string,
    anterior: keyof typeof ID_ESTATUS | null,
    nuevo: keyof typeof ID_ESTATUS,
    cuando: string,
    quien: UsuarioPrueba,
  ) =>
    insertarCambioDeEstatus(
      ctx.ds,
      etapaId,
      anterior ? ID_ESTATUS[anterior] : null,
      ID_ESTATUS[nuevo],
      null,
      quien.id,
      cuando,
    );

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    reloj = ctx.app.select(ReportesModule).get(Reloj, { strict: true });
    jest.spyOn(reloj, 'ahora').mockReturnValue(new Date('2026-11-11T12:00:00-05:00'));
    catalogo = await idsDeCatalogo(ctx.ds);
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-162 periodo trimestral: el trimestre de calendario que contiene la fecha, con el borde de fin de año', async () => {
    const asesor = await nuevoAsesor('Elena', 'Rivas');
    const casos: [string, string, string][] = [
      ['2026-01-01', '2026-01-01', '2026-03-31'],
      ['2026-03-31', '2026-01-01', '2026-03-31'],
      ['2026-04-01', '2026-04-01', '2026-06-30'],
      ['2026-06-30', '2026-04-01', '2026-06-30'],
      ['2026-07-15', '2026-07-01', '2026-09-30'],
      ['2026-09-30', '2026-07-01', '2026-09-30'],
      ['2026-10-01', '2026-10-01', '2026-12-31'],
      ['2026-12-31', '2026-10-01', '2026-12-31'],
      ['2027-01-01', '2027-01-01', '2027-03-31'],
      ['2028-03-31', '2028-01-01', '2028-03-31'],
    ];
    for (const [fecha, desde, hasta] of casos) {
      const r = await reporte(asesor, `?periodo=trimestral&fecha=${fecha}`);
      expect([r.periodo, r.desde, r.hasta]).toEqual(['trimestral', desde, hasta]);
    }
    // Sin fecha: el trimestre de hoy (11/11/2026).
    const hoy = await reporte(asesor, '?periodo=trimestral');
    expect([hoy.desde, hoy.hasta]).toEqual(['2026-10-01', '2026-12-31']);
    // El supervisor también puede pedirlo.
    expect((await reporte(supervisor, '?periodo=trimestral')).alcance).toBe('supervisor');
  });

  it('CP-163 periodo inválido sigue dando 400 en español, en JSON y en PDF', async () => {
    const asesor = await nuevoAsesor('Elena', 'Rivas');
    for (const ruta of ['/reportes', '/reportes/pdf']) {
      for (const consulta of ['', '?periodo=anual', '?periodo=Trimestral', '?periodo=trimestre']) {
        const r = await pedir(`${ruta}${consulta}`, asesor);
        expect(r.status).toBe(400);
        const cuerpo = (await r.json()) as { message: string | string[] };
        expect(JSON.stringify(cuerpo.message)).toContain(
          'periodo debe ser semanal, mensual o trimestral.',
        );
      }
    }
  });

  it('CP-164 las secciones existentes usan el rango del trimestre (finalizados, clientes nuevos, rechazo)', async () => {
    const asesor = await nuevoAsesor('Elena', 'Rivas');
    const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id, {
      fecha_ingreso: '2026-10-01',
    });
    await insertarCliente(ctx.ds, catalogo, asesor.id, { fecha_ingreso: '2026-09-30' }); // fuera
    const e1 = await insertarEtapa(ctx.ds, cliente, 1, ID_ESTATUS.Finalizado, 100);
    await marcarFinalizada(ctx.ds, e1, '2026-10-01'); // primer día del trimestre
    const e2 = await insertarEtapa(ctx.ds, cliente, 2, ID_ESTATUS.Finalizado, 100);
    await marcarFinalizada(ctx.ds, e2, '2026-12-31'); // último día
    const e3 = await insertarEtapa(ctx.ds, cliente, 3, ID_ESTATUS.Finalizado, 100);
    await marcarFinalizada(ctx.ds, e3, '2026-09-30'); // fuera
    await insertarCambioDeEstatus(
      ctx.ds,
      e1,
      ID_ESTATUS['En proceso asesor'],
      ID_ESTATUS.Bloqueado,
      'Falta acta',
      asesor.id,
      '2026-10-01T00:00:00-05:00',
    );

    const trimestral = await reporte(asesor, '?periodo=trimestral');
    expect(trimestral.finalizados.total).toBe(2);
    expect(trimestral.clientes_nuevos.total).toBe(1);
    expect(trimestral.rechazo).toMatchObject({ bloqueos: 1, etapas_con_cambios: 1 });
    // Con el mismo dato, el periodo mensual de noviembre no lo ve.
    const mensual = await reporte(asesor, '?periodo=mensual');
    expect(mensual.finalizados.total).toBe(0);
    expect(mensual.clientes_nuevos.total).toBe(0);
    expect(mensual.rechazo.bloqueos).toBe(0);
  });

  it('CP-165 trazabilidad: cambios de etapas 0 a 4 dentro del periodo, recientes primero, con estatus anterior null en el primero', async () => {
    const asesor = await nuevoAsesor('Elena', 'Rivas');
    const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id, {
      nombre: 'Rosa',
      apellido_paterno: 'Pérez',
      apellido_materno: 'Ficticia',
    });
    const e0 = await insertarEtapa(ctx.ds, cliente, 0, ID_ESTATUS['En proceso asesor'], 40);
    const e1 = await insertarEtapa(ctx.ds, cliente, 1, ID_ESTATUS.Bloqueado, 40);
    const e7 = await insertarEtapa(ctx.ds, cliente, 7, ID_ESTATUS['En proceso asesor'], 40);
    await cambio(e0, null, 'Por iniciar', '2026-11-02T10:00:00-05:00', asesor);
    await cambio(e0, 'Por iniciar', 'En proceso asesor', '2026-11-10T23:30:00-05:00', asesor);
    await cambio(e1, 'En proceso asesor', 'Bloqueado', '2026-11-05T09:00:00-05:00', asesor);
    await cambio(e7, 'Por iniciar', 'En proceso asesor', '2026-11-06T09:00:00-05:00', asesor); // etapa 7: no
    await cambio(e0, 'Por iniciar', 'Cancelado', '2026-10-31T23:59:59-05:00', asesor); // antes: no
    await cambio(e0, 'Por iniciar', 'Cancelado', '2026-12-01T00:00:00-05:00', asesor); // después: no

    const r = await reporte(asesor, '?periodo=mensual');
    expect(r.trazabilidad.total).toBe(3);
    expect(r.trazabilidad.lista).toEqual([
      {
        cliente: 'Rosa Pérez Ficticia',
        numero_paso: 0,
        etapa: 'Diagnóstico inicial',
        estatus_anterior: 'Por iniciar',
        estatus_nuevo: 'En proceso asesor',
        // 23:30 de Cancún del 10 (04:30 UTC del 11): la fecha es la de Cancún.
        fecha: '2026-11-10',
        asesor: 'Elena Rivas',
      },
      {
        cliente: 'Rosa Pérez Ficticia',
        numero_paso: 1,
        etapa: 'Diagnóstico especializado',
        estatus_anterior: 'En proceso asesor',
        estatus_nuevo: 'Bloqueado',
        fecha: '2026-11-05',
        asesor: 'Elena Rivas',
      },
      {
        cliente: 'Rosa Pérez Ficticia',
        numero_paso: 0,
        etapa: 'Diagnóstico inicial',
        estatus_anterior: null,
        estatus_nuevo: 'Por iniciar',
        fecha: '2026-11-02',
        asesor: 'Elena Rivas',
      },
    ]);
    // El trimestre suma también el del 31 de octubre y el del 1 de diciembre; la semana del 16 al 22, ninguno.
    expect((await reporte(asesor, '?periodo=trimestral')).trazabilidad.total).toBe(5);
    const otraSemana = await reporte(asesor, '?periodo=semanal&fecha=2026-11-18');
    expect(otraSemana.trazabilidad).toEqual({ total: 0, lista: [] });
  });

  it('CP-166 trazabilidad con alcance por rol: el asesor solo lo suyo, el supervisor todo, el auxiliar 403', async () => {
    const a = await nuevoAsesor('Elena', 'Rivas');
    const b = await nuevoAsesor('Mateo', 'Lara');
    for (const [asesor, apellido] of [
      [a, 'AlfaUnico'],
      [b, 'BetaUnico'],
    ] as const) {
      const c = await insertarCliente(ctx.ds, catalogo, asesor.id, {
        nombre: 'Cliente',
        apellido_paterno: apellido,
        apellido_materno: 'X',
      });
      const e = await insertarEtapa(ctx.ds, c, 2, ID_ESTATUS['En proceso asesor'], 40);
      await cambio(e, 'Por iniciar', 'En proceso asesor', '2026-11-09T10:00:00-05:00', asesor);
    }
    const deA = await reporte(a, '?periodo=mensual');
    expect(deA.trazabilidad.lista.map((f) => f.cliente)).toEqual(['Cliente AlfaUnico X']);
    expect(deA.trazabilidad.lista[0].asesor).toBe('Elena Rivas');
    const deB = await reporte(b, '?periodo=mensual');
    expect(deB.trazabilidad.lista.map((f) => f.asesor)).toEqual(['Mateo Lara']);

    const deS = await reporte(supervisor, '?periodo=mensual');
    const clientes = deS.trazabilidad.lista.map((f) => f.cliente);
    expect(deS.trazabilidad.total).toBeGreaterThanOrEqual(2);
    expect(clientes.length).toBeLessThanOrEqual(20);
    expect((await pedir('/reportes?periodo=mensual', auxiliar)).status).toBe(403);
    expect((await pedir('/reportes?periodo=mensual')).status).toBe(401);
  });

  it('CP-167 la lista de trazabilidad se limita a 20 pero el total es completo, y el orden es del más reciente al más antiguo', async () => {
    const asesor = await nuevoAsesor('Elena', 'Rivas');
    const c = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const e = await insertarEtapa(ctx.ds, c, 3, ID_ESTATUS['En proceso asesor'], 40);
    for (let i = 0; i < 25; i++) {
      // Un cambio por minuto, el 1 de noviembre desde las 10:00.
      const minuto = String(i).padStart(2, '0');
      await cambio(
        e,
        'Por iniciar',
        'En proceso asesor',
        `2026-11-01T10:${minuto}:00-05:00`,
        asesor,
      );
    }
    const r = await reporte(asesor, '?periodo=mensual');
    expect(r.trazabilidad.total).toBe(25);
    expect(r.trazabilidad.lista).toHaveLength(20);
    // Los 20 más recientes (se omiten los 5 primeros); todos del 1 de noviembre.
    expect(r.trazabilidad.lista.every((f) => f.fecha === '2026-11-01')).toBe(true);
    const ordenReal = await ctx.ds.query<{ fecha_cambio: Date }[]>(
      `SELECT h.fecha_cambio FROM etapas_tramite_historial h WHERE h.etapa_tramite_id = $1
       ORDER BY h.fecha_cambio DESC LIMIT 20`,
      [e],
    );
    expect(ordenReal).toHaveLength(20);
  });

  it('CP-168 sin N+1: el número de consultas del reporte no crece con el número de cambios', async () => {
    const pocos = await nuevoAsesor('Elena', 'Rivas');
    const muchos = await nuevoAsesor('Mateo', 'Lara');
    const cp = await insertarCliente(ctx.ds, catalogo, pocos.id);
    const ep = await insertarEtapa(ctx.ds, cp, 1, ID_ESTATUS['En proceso asesor'], 40);
    await cambio(ep, null, 'Por iniciar', '2026-11-03T10:00:00-05:00', pocos);
    for (let i = 0; i < 12; i++) {
      const c = await insertarCliente(ctx.ds, catalogo, muchos.id);
      const e = await insertarEtapa(ctx.ds, c, 1, ID_ESTATUS['En proceso asesor'], 40);
      await cambio(e, null, 'Por iniciar', '2026-11-03T10:00:00-05:00', muchos);
      await cambio(e, 'Por iniciar', 'En proceso asesor', '2026-11-04T10:00:00-05:00', muchos);
    }
    const proto = Object.getPrototypeOf(ctx.ds.createQueryRunner());
    const espia = jest.spyOn(proto, 'query');
    await reporte(pocos, '?periodo=mensual');
    const conUno = espia.mock.calls.length;
    espia.mockClear();
    const grande = await reporte(muchos, '?periodo=mensual');
    const conMuchos = espia.mock.calls.length;
    espia.mockRestore();
    expect(grande.trazabilidad.total).toBe(24);
    expect(conUno).toBeGreaterThan(0);
    expect(conMuchos).toBe(conUno);
  });

  it('CP-169 PDF trimestral: título, nombre de archivo y la tabla de trazabilidad después de Clientes nuevos', async () => {
    const asesor = await nuevoAsesor('Elena', 'Rivas');
    const c = await insertarCliente(ctx.ds, catalogo, asesor.id, {
      nombre: 'Rosa',
      apellido_paterno: 'Trazable',
      apellido_materno: 'Ficticia',
    });
    const e = await insertarEtapa(ctx.ds, c, 2, ID_ESTATUS.Bloqueado, 40);
    await cambio(e, 'En proceso asesor', 'Bloqueado', '2026-11-05T09:00:00-05:00', asesor);

    const r = await pedir('/reportes/pdf?periodo=trimestral', asesor);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-disposition')).toContain(
      'filename="Reporte-operativo-trimestral-2026-10-01.pdf"',
    );
    const texto = await textoDePdf(Buffer.from(await r.arrayBuffer()));
    expect(texto).toContain('Reporte operativo trimestral');
    expect(texto).toContain('Trimestral');
    expect(texto).toContain('01/10/2026');
    expect(texto).toContain('31/12/2026');
    const iNuevos = texto.indexOf('Clientes nuevos y distribución por régimen');
    const iTraza = texto.indexOf('Trazabilidad de etapas');
    expect(iNuevos).toBeGreaterThan(-1);
    expect(iTraza).toBeGreaterThan(iNuevos);
    expect(texto.slice(iTraza)).toContain('Rosa Trazable Ficticia');
    expect(texto.slice(iTraza)).toContain('Bloqueado');
    expect(texto.slice(iTraza)).toContain('Elena Rivas');
  });
});
