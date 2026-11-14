import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { ClientesService } from './clientes.service';

// Servicio contra la base de pruebas real: el alcance por rol se resuelve en SQL, no en memoria.
jest.setTimeout(60_000);

describeConBd('ClientesService.listar (base de pruebas)', () => {
  let ctx: AppConBd;
  let servicio: ClientesService;
  let catalogo: IdsCatalogo;

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    servicio = ctx.app.get(ClientesService);
    catalogo = await idsDeCatalogo(ctx.ds);
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-14 listar: asesor ve solo los suyos, auxiliar solo los autorizados activos, supervisor todos', async () => {
    const asesorA: UsuarioPrueba = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const asesorB = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    const supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');

    const deA1 = await insertarCliente(ctx.ds, catalogo, asesorA.id);
    const deA2 = await insertarCliente(ctx.ds, catalogo, asesorA.id);
    const deB = await insertarCliente(ctx.ds, catalogo, asesorB.id);
    const deAInactivo = await insertarCliente(ctx.ds, catalogo, asesorA.id);
    await autorizarEnBd(ctx.ds, deA1, auxiliar.id, asesorA.id, true);
    await autorizarEnBd(ctx.ds, deB, auxiliar.id, asesorB.id, true);
    await autorizarEnBd(ctx.ds, deAInactivo, auxiliar.id, asesorA.id, false);

    const ids = async (u: UsuarioPrueba) =>
      (await servicio.listar({ sub: u.id, rol: u.rol })).map((c) => c.id).sort();

    expect(await ids(asesorA)).toEqual([deA1, deA2, deAInactivo].sort());
    expect(await ids(asesorB)).toEqual([deB]);
    expect(await ids(auxiliar)).toEqual([deA1, deB].sort());

    const todos = await ids(supervisor);
    expect(todos).toEqual(expect.arrayContaining([deA1, deA2, deB, deAInactivo]));
  });
});
