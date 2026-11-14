import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Auxiliares del cliente (no se cuelgan) y listado de auxiliares disponibles: aplicación real y base de pruebas.
jest.setTimeout(60_000);

describeConBd('Auxiliares: ruta del cliente y listado de auxiliares (aplicación real)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  let auxiliarA: UsuarioPrueba;
  let auxiliarB: UsuarioPrueba;
  let auxiliarInactivo: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

  // Si la petición no responde en 5 s la prueba falla (antes se quedaba colgada hasta agotar el tiempo).
  async function pedir(metodo: string, ruta: string, token?: string, datos?: object) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(datos ? { 'Content-Type': 'application/json' } : {}),
      },
      body: datos ? JSON.stringify(datos) : undefined,
      signal: AbortSignal.timeout(5_000),
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, texto, json: texto ? JSON.parse(texto) : null };
  }

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    auxiliarA = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    auxiliarB = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    auxiliarInactivo = await crearUsuarioPrueba(ctx.ds, 'auxiliar', { activo: false });
    // Nombres distintos para comprobar el orden; también un asesor y un supervisor que NO deben salir.
    await ctx.ds.query(`UPDATE usuarios SET nombre = 'Zoe' WHERE id = $1`, [auxiliarA.id]);
    await ctx.ds.query(`UPDATE usuarios SET nombre = 'Ana' WHERE id = $1`, [auxiliarB.id]);
    await ctx.ds.query(`UPDATE usuarios SET nombre = 'Mario' WHERE id = $1`, [auxiliarInactivo.id]);
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-143 GET, POST y PATCH de /clientes/:id/auxiliares responden con el asesor dueño, también en ráfaga y en secuencia', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const ruta = `/clientes/${clienteId}/auxiliares`;

    // Ráfaga de lecturas simultáneas: ninguna puede quedarse esperando.
    const rafaga = await Promise.all(
      Array.from({ length: 30 }, () => pedir('GET', ruta, t(asesor))),
    );
    expect(rafaga.every((r) => r.estado === 200 && r.json.length === 0)).toBe(true);

    const alta = await pedir('POST', ruta, t(asesor), { auxiliar_id: auxiliarA.id });
    expect(alta.estado).toBe(201);
    expect(alta.json).toMatchObject({
      cliente_id: clienteId,
      auxiliar_id: auxiliarA.id,
      activo: true,
    });

    // Lecturas y escrituras mezcladas sobre la misma fila.
    const mezcla = await Promise.all([
      pedir('GET', ruta, t(asesor)),
      pedir('PATCH', `${ruta}/${alta.json.id}`, t(asesor), { activo: false }),
      pedir('POST', ruta, t(asesor), { auxiliar_id: auxiliarA.id }),
      pedir('GET', ruta, t(asesor)),
    ]);
    expect(mezcla.map((r) => r.estado)).toEqual([200, 200, 201, 200]);

    const reactivada = await pedir('PATCH', `${ruta}/${alta.json.id}`, t(asesor), { activo: true });
    expect(reactivada.estado).toBe(200);
    expect(reactivada.json.activo).toBe(true);

    const lista = await pedir('GET', ruta, t(asesor));
    expect(lista.estado).toBe(200);
    expect(lista.json).toHaveLength(1);
  });

  it('CP-144 GET /auxiliares: asesor y supervisor reciben solo usuarios con rol auxiliar, ordenados por nombre y sin datos sensibles', async () => {
    for (const quien of [asesor, supervisor]) {
      const r = await pedir('GET', '/auxiliares', t(quien));
      expect(r.estado).toBe(200);
      const mios = (r.json as { id: string }[]).filter((u) =>
        [auxiliarA.id, auxiliarB.id, auxiliarInactivo.id].includes(u.id),
      );
      // Ana, Mario (inactivo), Zoe: ordenados por nombre; el asesor y el supervisor de prueba no aparecen.
      expect(mios.map((u) => u.id)).toEqual([auxiliarB.id, auxiliarInactivo.id, auxiliarA.id]);
      const ids = (r.json as { id: string }[]).map((u) => u.id);
      expect(ids).not.toContain(asesor.id);
      expect(ids).not.toContain(supervisor.id);

      const ana = (r.json as Record<string, unknown>[]).find((u) => u.id === auxiliarB.id);
      expect(Object.keys(ana as object).sort()).toEqual(
        [
          'activo',
          'apellido_materno',
          'apellido_paterno',
          'correo_electronico',
          'id',
          'nombre',
        ].sort(),
      );
      expect(ana).toMatchObject({ nombre: 'Ana', activo: true });
      const inactivo = (r.json as Record<string, unknown>[]).find(
        (u) => u.id === auxiliarInactivo.id,
      );
      expect(inactivo).toMatchObject({ activo: false });
      expect(r.texto).not.toContain('contrasena');
      expect(r.texto).not.toContain('hash-ficticio-no-valido');
    }
  });

  it('CP-145 GET /auxiliares: el auxiliar recibe 403 y sin token 401', async () => {
    const aux = await pedir('GET', '/auxiliares', t(auxiliarA));
    expect(aux.estado).toBe(403);
    const sin = await pedir('GET', '/auxiliares');
    expect(sin.estado).toBe(401);
  });
});
