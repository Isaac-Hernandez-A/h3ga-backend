import { randomUUID } from 'node:crypto';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  cuerpoCliente,
  curpFicticia,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Flujo HTTP real: AppModule completo (guards, pipes, filtro de errores) contra la base de pruebas.
// Solo datos ficticios; al final se borra todo lo marcado como prueba.
// Campos de las respuestas que estas pruebas leen.
interface Respuesta {
  id: string;
  asesor_id: string;
  nombre: string;
  autorizado_por: string;
  activo: boolean;
  salario_promedio: number;
  semanas_issste: number;
}

jest.setTimeout(60_000);

describeConBd('Clientes y autorizaciones del auxiliar (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

  async function pedir(metodo: string, ruta: string, token?: string, datos?: object) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(datos ? { 'Content-Type': 'application/json' } : {}),
      },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    const texto = await respuesta.text();
    const json = texto ? JSON.parse(texto) : {};
    return { estado: respuesta.status, json: json as Respuesta };
  }

  const clienteDe = (u: UsuarioPrueba) => insertarCliente(ctx.ds, catalogo, u.id);

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

  it('CP-15 crear fija asesor_id = sub e ignora el asesor_id enviado', async () => {
    const { estado, json } = await pedir(
      'POST',
      '/clientes',
      t(asesor),
      cuerpoCliente(catalogo, { asesor_id: otroAsesor.id }),
    );
    expect(estado).toBe(201);
    expect(json.asesor_id).toBe(asesor.id);
    const filas = await ctx.ds.query<{ asesor_id: string }[]>(
      'SELECT asesor_id FROM clientes WHERE id = $1',
      [json.id],
    );
    expect(filas[0].asesor_id).toBe(asesor.id);
  });

  it('CP-16 CURP con formato inválido responde 400; CURP repetida responde 409', async () => {
    const invalida = await pedir(
      'POST',
      '/clientes',
      t(asesor),
      cuerpoCliente(catalogo, { curp: 'CURP-INVALIDA' }),
    );
    expect(invalida.estado).toBe(400);

    const curp = curpFicticia();
    const primera = await pedir('POST', '/clientes', t(asesor), cuerpoCliente(catalogo, { curp }));
    expect(primera.estado).toBe(201);
    const repetida = await pedir('POST', '/clientes', t(asesor), cuerpoCliente(catalogo, { curp }));
    expect(repetida.estado).toBe(409);
  });

  it('CP-17 un asesor que no es dueño no puede editar el cliente (404)', async () => {
    const clienteId = await clienteDe(asesor);
    const ajeno = await pedir('PATCH', `/clientes/${clienteId}`, t(otroAsesor), { nombre: 'X' });
    expect(ajeno.estado).toBe(404);

    const propio = await pedir('PATCH', `/clientes/${clienteId}`, t(asesor), { nombre: 'Nuevo' });
    expect(propio.estado).toBe(200);
    expect(propio.json.nombre).toBe('Nuevo');
    const filas = await ctx.ds.query<{ nombre: string }[]>(
      'SELECT nombre FROM clientes WHERE id = $1',
      [clienteId],
    );
    expect(filas[0].nombre).toBe('Nuevo');
  });

  it('CP-18 reasignar: supervisor 200; asesor 403; destino inexistente o que no es asesor responde 400', async () => {
    const clienteId = await clienteDe(asesor);
    const ruta = `/clientes/${clienteId}/asesor`;

    expect((await pedir('PATCH', ruta, t(asesor), { asesor_id: otroAsesor.id })).estado).toBe(403);
    expect((await pedir('PATCH', ruta, t(supervisor), { asesor_id: randomUUID() })).estado).toBe(
      400,
    );
    expect((await pedir('PATCH', ruta, t(supervisor), { asesor_id: auxiliar.id })).estado).toBe(
      400,
    );

    const ok = await pedir('PATCH', ruta, t(supervisor), { asesor_id: otroAsesor.id });
    expect(ok.estado).toBe(200);
    expect(ok.json.asesor_id).toBe(otroAsesor.id);
    // El expediente ya no es del asesor anterior.
    expect((await pedir('GET', `/clientes/${clienteId}`, t(asesor))).estado).toBe(404);
    expect((await pedir('GET', `/clientes/${clienteId}`, t(otroAsesor))).estado).toBe(200);
  });

  it('CP-19 autorizar guarda autorizado_por = sub; repetir el par reactiva la fila sin duplicar; el usuario debe ser auxiliar', async () => {
    const clienteId = await clienteDe(asesor);
    const ruta = `/clientes/${clienteId}/auxiliares`;
    const filas = () =>
      ctx.ds.query<{ id: string; autorizado_por: string; activo: boolean }[]>(
        'SELECT id, autorizado_por, activo FROM cliente_auxiliares WHERE cliente_id = $1 AND auxiliar_id = $2',
        [clienteId, auxiliar.id],
      );

    const primera = await pedir('POST', ruta, t(asesor), { auxiliar_id: auxiliar.id });
    expect(primera.estado).toBe(201);
    expect(primera.json.autorizado_por).toBe(asesor.id);
    expect(await filas()).toHaveLength(1);

    // Se revoca y se vuelve a otorgar: la misma fila, activa, sin duplicados.
    await ctx.ds.query('UPDATE cliente_auxiliares SET activo = false WHERE id = $1', [
      primera.json.id,
    ]);
    const segunda = await pedir('POST', ruta, t(asesor), { auxiliar_id: auxiliar.id });
    expect(segunda.estado).toBe(201);
    const despues = await filas();
    expect(despues).toHaveLength(1);
    expect(despues[0]).toMatchObject({
      id: primera.json.id,
      activo: true,
      autorizado_por: asesor.id,
    });

    // El usuario autorizado debe existir y ser auxiliar.
    expect((await pedir('POST', ruta, t(asesor), { auxiliar_id: otroAsesor.id })).estado).toBe(400);
    expect((await pedir('POST', ruta, t(asesor), { auxiliar_id: randomUUID() })).estado).toBe(400);
  });

  it('CP-20 desactivar la autorización quita el acceso en la siguiente petición (404)', async () => {
    const clienteId = await clienteDe(asesor);
    const alta = await pedir('POST', `/clientes/${clienteId}/auxiliares`, t(asesor), {
      auxiliar_id: auxiliar.id,
    });
    expect(alta.estado).toBe(201);
    expect((await pedir('GET', `/clientes/${clienteId}`, t(auxiliar))).estado).toBe(200);

    const baja = await pedir(
      'PATCH',
      `/clientes/${clienteId}/auxiliares/${alta.json.id}`,
      t(asesor),
      { activo: false },
    );
    expect(baja.estado).toBe(200);
    expect(baja.json.activo).toBe(false);
    expect((await pedir('GET', `/clientes/${clienteId}`, t(auxiliar))).estado).toBe(404);

    const otra = await pedir(
      'PATCH',
      `/clientes/${clienteId}/auxiliares/${randomUUID()}`,
      t(asesor),
      { activo: true },
    );
    expect(otra.estado).toBe(404);
  });

  it('CP-21 PUT historial-laboral es idempotente: dos PUT iguales dejan un solo registro', async () => {
    const clienteId = await clienteDe(asesor);
    const ruta = `/clientes/${clienteId}/historial-laboral`;
    const cuerpo = {
      semanas_issste: 120,
      salario_promedio: 15234.5,
      ultimo_patron: 'Patrón ficticio',
      vigencia_derechos: 'si',
    };
    const uno = await pedir('PUT', ruta, t(asesor), cuerpo);
    const dos = await pedir('PUT', ruta, t(asesor), cuerpo);
    expect(uno.estado).toBe(200);
    expect(dos.estado).toBe(200);
    expect(dos.json.id).toBe(uno.json.id);
    expect(dos.json.salario_promedio).toBe(15234.5);

    const cambio = await pedir('PUT', ruta, t(asesor), { ...cuerpo, semanas_issste: 130 });
    expect(cambio.json.semanas_issste).toBe(130);
    const filas = await ctx.ds.query<{ semanas_issste: number }[]>(
      'SELECT semanas_issste FROM historial_laboral WHERE cliente_id = $1',
      [clienteId],
    );
    expect(filas).toEqual([{ semanas_issste: 130 }]);
  });

  it('PUT objetivos-especificos reemplaza el conjunto y rechaza ids que no existen (400)', async () => {
    const clienteId = await clienteDe(asesor);
    const ruta = `/clientes/${clienteId}/objetivos-especificos`;
    const ids = (
      await ctx.ds.query<{ id: number }[]>('SELECT id FROM objetivo_especifico_inicial ORDER BY id')
    ).map((f) => f.id);

    const uno = await pedir('PUT', ruta, t(asesor), { objetivo_ids: [ids[0], ids[1]] });
    expect(uno.estado).toBe(200);
    const dos = await pedir('PUT', ruta, t(asesor), { objetivo_ids: [ids[1], ids[2]] });
    expect(dos.estado).toBe(200);
    const filas = await ctx.ds.query<{ objetivo_id: number }[]>(
      'SELECT objetivo_id FROM cliente_objetivos_especificos WHERE cliente_id = $1 ORDER BY 1',
      [clienteId],
    );
    expect(filas.map((f) => f.objetivo_id)).toEqual([ids[1], ids[2]]);

    // Un id inexistente no debe dejar el conjunto a medias: queda el anterior.
    const mal = await pedir('PUT', ruta, t(asesor), { objetivo_ids: [ids[0], 32000] });
    expect(mal.estado).toBe(400);
    const intactas = await ctx.ds.query<{ objetivo_id: number }[]>(
      'SELECT objetivo_id FROM cliente_objetivos_especificos WHERE cliente_id = $1 ORDER BY 1',
      [clienteId],
    );
    expect(intactas.map((f) => f.objetivo_id)).toEqual([ids[1], ids[2]]);

    // Fuera del rango de smallint: 400, no 500.
    expect((await pedir('PUT', ruta, t(asesor), { objetivo_ids: [40000] })).estado).toBe(400);
  });
});
