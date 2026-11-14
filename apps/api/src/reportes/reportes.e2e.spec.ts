import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
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

// GET /api/v1/reportes por HTTP (AppModule completo): roles, validación de parámetros y forma de la respuesta.
jest.setTimeout(60_000);

describeConBd('Reporte operativo por HTTP (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const pedir = (consulta: string, u?: UsuarioPrueba) =>
    fetch(`${ctx.base}/reportes${consulta}`, {
      headers: u ? { Authorization: `Bearer ${tokenDe(u.rol, u.id)}` } : {},
    });

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    const cliente = await insertarCliente(ctx.ds, catalogo, asesor.id);
    await insertarEtapa(ctx.ds, cliente, 0, ID_ESTATUS['Por iniciar'], 10);
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-57 el asesor y el supervisor reciben el reporte (200); el auxiliar recibe 403; sin token, 401', async () => {
    const delAsesor = await pedir('?periodo=semanal', asesor);
    expect(delAsesor.status).toBe(200);
    const cuerpo = (await delAsesor.json()) as Record<string, unknown>;
    expect(cuerpo).toMatchObject({ periodo: 'semanal', alcance: 'asesor' });
    expect(cuerpo).toHaveProperty('cartera');
    expect(cuerpo).toHaveProperty('finalizados');
    expect(cuerpo).toHaveProperty('vencimientos');
    expect(cuerpo).toHaveProperty('rechazo');
    expect(cuerpo).toHaveProperty('clientes_nuevos');
    expect(cuerpo).not.toHaveProperty('por_asesor');

    const delSupervisor = (await (await pedir('?periodo=mensual', supervisor)).json()) as Record<
      string,
      unknown
    >;
    expect(delSupervisor).toMatchObject({ periodo: 'mensual', alcance: 'supervisor' });
    expect(Array.isArray(delSupervisor.por_asesor)).toBe(true);

    expect((await pedir('?periodo=semanal', auxiliar)).status).toBe(403);
    expect((await pedir('?periodo=semanal')).status).toBe(401);
  });

  it('valida los parámetros: periodo obligatorio y válido; fecha real; sin parámetros desconocidos', async () => {
    for (const consulta of [
      '',
      '?periodo=anual',
      '?periodo=semanal&fecha=2026-02-30',
      '?periodo=semanal&fecha=ayer',
      '?periodo=semanal&desde=2026-11-01',
    ]) {
      expect((await pedir(consulta, asesor)).status).toBe(400);
    }
    // Con una fecha de referencia válida, el rango sale de ella.
    const r = (await (await pedir('?periodo=semanal&fecha=2026-11-04', asesor)).json()) as {
      desde: string;
      hasta: string;
    };
    expect([r.desde, r.hasta]).toEqual(['2026-11-02', '2026-11-08']);
  });
});
