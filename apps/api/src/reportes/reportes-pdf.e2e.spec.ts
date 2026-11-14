import { Reloj } from '../common/fechas';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  fijarCompromiso,
  ID_ESTATUS,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  insertarEtapa,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { textoDePdf } from '../common/testing/texto-de-pdf';
import { tokenDe } from '../common/testing/tokens';
import { ReportesModule } from './reportes.module';

// GET /api/v1/reportes/pdf por HTTP (AppModule completo) con la hora fijada: hoy = miércoles 11/11/2026.
jest.setTimeout(90_000);

describeConBd('Reporte operativo en PDF por HTTP (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let reloj: Reloj;
  let catalogo: IdsCatalogo;
  let asesorA: UsuarioPrueba;
  let asesorB: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const pedir = (consulta: string, u?: UsuarioPrueba) =>
    fetch(`${ctx.base}/reportes/pdf${consulta}`, {
      headers: u ? { Authorization: `Bearer ${tokenDe(u.rol, u.id)}` } : {},
    });

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    reloj = ctx.app.select(ReportesModule).get(Reloj, { strict: true });
    jest.spyOn(reloj, 'ahora').mockReturnValue(new Date('2026-11-11T12:00:00-05:00'));
    catalogo = await idsDeCatalogo(ctx.ds);
    asesorA = await crearUsuarioPrueba(ctx.ds, 'asesor');
    asesorB = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    // Cada asesor tiene un cliente con una etapa vencida: sus nombres aparecen en la lista de vencimientos.
    for (const [asesor, apellido] of [
      [asesorA, 'AlfaUnico'],
      [asesorB, 'BetaUnico'],
    ] as const) {
      const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id, {
        nombre: 'Cliente',
        apellido_paterno: apellido,
      });
      const etapa = await insertarEtapa(ctx.ds, cliente, 1, ID_ESTATUS['En proceso asesor'], 40);
      await fijarCompromiso(ctx.ds, etapa, '2026-11-10');
    }
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-64 la ruta responde 200, Content-Type application/pdf y el cuerpo empieza con %PDF-', async () => {
    const r = await pedir('?periodo=semanal', asesorA);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('application/pdf');
    expect(r.headers.get('content-disposition')).toMatch(/\.pdf/);
    const cuerpo = Buffer.from(await r.arrayBuffer());
    expect(cuerpo.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(cuerpo.length).toBeGreaterThan(1000);
  });

  it('CP-67 el auxiliar recibe 403 y el asesor solo obtiene un PDF con sus clientes', async () => {
    expect((await pedir('?periodo=semanal', auxiliar)).status).toBe(403);
    expect((await pedir('?periodo=semanal')).status).toBe(401);

    const texto = async (u: UsuarioPrueba) =>
      textoDePdf(Buffer.from(await (await pedir('?periodo=semanal', u)).arrayBuffer()));
    const delAsesorA = await texto(asesorA);
    expect(delAsesorA).toContain('AlfaUnico');
    expect(delAsesorA).not.toContain('BetaUnico');
    expect(delAsesorA).not.toContain('Avance promedio por asesor');

    const delSupervisor = await texto(supervisor);
    expect(delSupervisor).toContain('Avance promedio por asesor');
    expect(delSupervisor).toContain('Prueba'); // nombre de los asesores de prueba en el desglose
  });

  it('valida los parámetros igual que el reporte en JSON', async () => {
    for (const consulta of ['', '?periodo=anual', '?periodo=semanal&fecha=2026-02-30']) {
      expect((await pedir(consulta, asesorA)).status).toBe(400);
    }
    const r = await pedir('?periodo=mensual&fecha=2026-10-15', asesorA);
    expect(r.status).toBe(200);
    expect(await textoDePdf(Buffer.from(await r.arrayBuffer()))).toContain('01/10/2026');
  });
});
