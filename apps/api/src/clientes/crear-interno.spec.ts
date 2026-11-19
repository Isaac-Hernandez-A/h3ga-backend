import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  cuerpoCliente,
  curpFicticia,
  IdsCatalogo,
  idsDeCatalogo,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { ClientesController } from './clientes.controller';

// ClientesService.crear con y sin el tercer argumento interno (Actividad 5, Tarea 9). Sin él, el
// comportamiento es idéntico al de siempre; con él, la importación desde Excel puede trabajar dentro de
// su propia transacción y fijar el asesor. Ninguna ruta HTTP recibe ese argumento.
jest.setTimeout(60_000);

describeConBd('ClientesService.crear: tercer argumento interno (base de pruebas)', () => {
  let ctx: AppConBd;
  let servicio: ClientesService;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;

  const dto = (extra: object = {}) =>
    cuerpoCliente(catalogo, { curp: curpFicticia(), ...extra }) as unknown as CreateClienteDto;
  const etapasDe = async (clienteId: string) =>
    Number(
      (
        await ctx.ds.query<{ n: string }[]>(
          `SELECT count(*) AS n FROM etapas_tramite WHERE cliente_id = $1`,
          [clienteId],
        )
      )[0].n,
    );

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    servicio = ctx.app.get(ClientesService);
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-265 sin tercer argumento el comportamiento es el de siempre: asesor_id es el del token, transacción propia y 16 etapas', async () => {
    const abrir = jest.spyOn(ctx.ds, 'transaction');
    // asesor_id en el cuerpo se ignora, como siempre.
    const cliente = await servicio.crear(
      { sub: asesor.id, rol: 'asesor' },
      dto({ asesor_id: otroAsesor.id }),
    );
    expect(cliente.asesor_id).toBe(asesor.id);
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(await etapasDe(cliente.id)).toBe(16);
  });

  it('CP-265 con asesorId, ese usuario es el asesor y no el del token', async () => {
    const cliente = await servicio.crear({ sub: supervisor.id, rol: 'supervisor' }, dto(), {
      asesorId: otroAsesor.id,
    });
    expect(cliente.asesor_id).toBe(otroAsesor.id);
    expect(await etapasDe(cliente.id)).toBe(16);
  });

  it('CP-267 con manager, trabaja dentro de esa transacción: no abre otra y se revierte con ella', async () => {
    const abrir = jest.spyOn(ctx.ds, 'transaction');
    const curp = curpFicticia();
    let id = '';
    await expect(
      ctx.ds.transaction(async (manager) => {
        const cliente = await servicio.crear({ sub: asesor.id, rol: 'asesor' }, dto({ curp }), {
          manager,
        });
        id = cliente.id;
        // Dentro de la transacción el cliente y sus etapas existen...
        const dentro = await manager.query<{ n: string }[]>(
          `SELECT count(*) AS n FROM etapas_tramite WHERE cliente_id = $1`,
          [id],
        );
        expect(Number(dentro[0].n)).toBe(16);
        throw new Error('revertir');
      }),
    ).rejects.toThrow('revertir');
    // Solo se abrió la transacción de la prueba (crear no abrió otra) y al revertirla no queda nada.
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(await ctx.ds.query(`SELECT 1 FROM clientes WHERE id = $1`, [id])).toEqual([]);
    expect(await etapasDe(id)).toBe(0);
  });

  it('CP-271 con manager, una CURP repetida sigue traduciéndose a 409 (Ya existe)', async () => {
    const curp = curpFicticia();
    await servicio.crear({ sub: asesor.id, rol: 'asesor' }, dto({ curp }));
    await expect(
      ctx.ds.transaction((manager) =>
        servicio.crear({ sub: asesor.id, rol: 'asesor' }, dto({ curp }), { manager }),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('CP-265 el controlador no pasa el argumento interno: crear de HTTP recibe solo usuario y cuerpo', () => {
    const crear = jest.spyOn(servicio, 'crear').mockResolvedValue({} as never);
    const controlador = ctx.app.get(ClientesController);
    const usuario = { sub: asesor.id, rol: 'asesor' as const };
    const cuerpo = dto({ asesorId: otroAsesor.id, manager: {} });
    void controlador.crearCliente(usuario, cuerpo);
    expect(crear).toHaveBeenCalledTimes(1);
    expect(crear.mock.calls[0]).toHaveLength(2);
    expect(crear.mock.calls[0][0]).toBe(usuario);
    expect(crear.mock.calls[0][1]).toBe(cuerpo);
  });
});
