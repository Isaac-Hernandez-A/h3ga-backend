import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  cuerpoCliente,
  IdsCatalogo,
  idsDeCatalogo,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// El Auxiliar lee las etapas y su historial solo en los clientes que le autorizaron (CP-81, D9).
jest.setTimeout(60_000);

interface EtapasCliente {
  etapas: { id: string; numero_paso: number }[];
}

describeConBd('Etapas: lectura del auxiliar (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

  async function pedir(metodo: string, ruta: string, token: string, datos?: object) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(datos ? { 'Content-Type': 'application/json' } : {}),
      },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, json: (texto ? JSON.parse(texto) : {}) as never };
  }

  // Cliente real creado por la API (trae sus 16 etapas) y un cambio de estatus para que haya historial.
  async function clienteConEtapas() {
    const creado = await pedir('POST', '/clientes', t(asesor), cuerpoCliente(catalogo));
    expect(creado.estado).toBe(201);
    const clienteId = (creado.json as { id: string }).id;
    const etapas = (await pedir('GET', `/clientes/${clienteId}/etapas`, t(asesor)))
      .json as EtapasCliente;
    const etapaId = etapas.etapas.find((e) => e.numero_paso === 0)!.id;
    const cambio = await pedir(
      'PATCH',
      `/clientes/${clienteId}/etapas/${etapaId}`,
      t(asesor),
      { estatus_id: 6 }, // Finalizado
    );
    expect(cambio.estado).toBe(200);
    return { clienteId, etapaId };
  }

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-81 el auxiliar con autorización activa lee las etapas y el historial (200)', async () => {
    const { clienteId, etapaId } = await clienteConEtapas();
    await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);

    const etapas = await pedir('GET', `/clientes/${clienteId}/etapas`, t(auxiliar));
    expect(etapas.estado).toBe(200);
    expect((etapas.json as EtapasCliente).etapas).toHaveLength(16);

    const historial = await pedir(
      'GET',
      `/clientes/${clienteId}/etapas/${etapaId}/historial`,
      t(auxiliar),
    );
    expect(historial.estado).toBe(200);
    expect((historial.json as unknown[]).length).toBeGreaterThan(0);
  });

  it('CP-81 sin autorización o con autorización inactiva el auxiliar recibe 404', async () => {
    const sinAutorizar = await clienteConEtapas();
    const inactiva = await clienteConEtapas();
    await autorizarEnBd(ctx.ds, inactiva.clienteId, auxiliar.id, asesor.id, false);

    for (const { clienteId, etapaId } of [sinAutorizar, inactiva]) {
      expect((await pedir('GET', `/clientes/${clienteId}/etapas`, t(auxiliar))).estado).toBe(404);
      expect(
        (await pedir('GET', `/clientes/${clienteId}/etapas/${etapaId}/historial`, t(auxiliar)))
          .estado,
      ).toBe(404);
    }
  });

  it('CP-81 el auxiliar sigue sin poder cambiar el estatus ni crear etapas (403), aun con autorización activa', async () => {
    const { clienteId, etapaId } = await clienteConEtapas();
    await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);

    const cambio = await pedir('PATCH', `/clientes/${clienteId}/etapas/${etapaId}`, t(auxiliar), {
      estatus_id: 4,
      avance_porcentaje: 30,
    });
    expect(cambio.estado).toBe(403);
    const crear = await pedir('POST', `/clientes/${clienteId}/etapas`, t(auxiliar), {});
    expect(crear.estado).toBe(403);
  });
});
