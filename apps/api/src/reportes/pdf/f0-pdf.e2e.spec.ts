import { AppConBd, describeConBd, iniciarAppConBd } from '../../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../../common/testing/datos-clientes';
import { tokenDe } from '../../common/testing/tokens';

// Flujo HTTP real (AppModule completo) de GET /clientes/:clienteId/diagnostico-inicial/pdf.
jest.setTimeout(60_000);

describeConBd('PDF del F0 por HTTP (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const pedir = (ruta: string, u?: UsuarioPrueba) =>
    fetch(`${ctx.base}${ruta}`, {
      headers: u ? { Authorization: `Bearer ${tokenDe(u.rol, u.id)}` } : {},
    });

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-50 la ruta responde 200, Content-Type application/pdf y el cuerpo empieza con %PDF-', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const r = await pedir(`/clientes/${clienteId}/diagnostico-inicial/pdf`, asesor);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('application/pdf');
    expect(r.headers.get('content-disposition')).toContain('.pdf');
    const cuerpo = Buffer.from(await r.arrayBuffer());
    expect(cuerpo.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(cuerpo.length).toBeGreaterThan(500);
  });

  it('CP-53 asesor ajeno recibe 404; asesor dueño, auxiliar autorizado y supervisor reciben 200', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const ruta = `/clientes/${clienteId}/diagnostico-inicial/pdf`;

    expect((await pedir(ruta, otroAsesor)).status).toBe(404);
    expect((await pedir(ruta, auxiliar)).status).toBe(404); // sin autorización
    expect((await pedir(ruta)).status).toBe(401);
    expect((await pedir(ruta, asesor)).status).toBe(200);
    await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);
    expect((await pedir(ruta, auxiliar)).status).toBe(200);
    expect((await pedir(ruta, supervisor)).status).toBe(200);
  });
});
