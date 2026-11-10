import { randomUUID } from 'node:crypto';
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
import { tokenDe } from '../common/testing/tokens';

// Lecturas del expediente que usa el frontend (CP-77 y CP-78): aplicación real y base de pruebas.
jest.setTimeout(60_000);

describeConBd('Lecturas del expediente del cliente (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
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
    return {
      estado: respuesta.status,
      texto,
      json: (texto && texto !== 'null' ? JSON.parse(texto) : null) as never,
    };
  }
  // "Sin datos" se responde 200 con el cuerpo vacío (Nest serializa null sin cuerpo) o con null.
  const esVacio = (r: { texto: string }) => ['', 'null'].includes(r.texto.trim());

  // Un cliente del asesor con el auxiliar autorizado.
  async function clienteConAuxiliar(): Promise<string> {
    const id = await insertarCliente(ctx.ds, catalogo, asesor.id);
    await autorizarEnBd(ctx.ds, id, auxiliar.id, asesor.id, true);
    return id;
  }

  // Comprueba la matriz de acceso de una lectura del expediente.
  async function accesos(ruta: string, esperadoAsesor: (r: never) => void) {
    const propio = await pedir('GET', ruta, t(asesor));
    expect(propio.estado).toBe(200);
    esperadoAsesor(propio as never);
    const sup = await pedir('GET', ruta, t(supervisor));
    expect(sup.estado).toBe(200);
    esperadoAsesor(sup as never);
    expect((await pedir('GET', ruta, t(otroAsesor))).estado).toBe(404);
    expect((await pedir('GET', ruta, t(auxiliar))).estado).toBe(403);
  }

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

  it('CP-77 historial laboral: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; sin datos responde vacío, no 500', async () => {
    const clienteId = await clienteConAuxiliar();
    const ruta = `/clientes/${clienteId}/historial-laboral`;

    const vacio = await pedir('GET', ruta, t(asesor));
    expect(vacio.estado).toBe(200);
    expect(esVacio(vacio)).toBe(true);

    const guardado = await pedir('PUT', ruta, t(asesor), {
      semanas_issste: 120,
      salario_promedio: 15234.5,
      ultimo_patron: 'Patrón Ficticio S.A. de C.V.',
      vigencia_derechos: 'si',
    });
    expect(guardado.estado).toBe(200);

    await accesos(ruta, (r: { json: Record<string, unknown> }) =>
      expect(r.json).toMatchObject({
        cliente_id: clienteId,
        semanas_issste: 120,
        salario_promedio: 15234.5,
        ultimo_patron: 'Patrón Ficticio S.A. de C.V.',
        vigencia_derechos: 'si',
      }),
    );
  });

  it('CP-77 información ISSSTE: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; sin historial o sin datos responde vacío', async () => {
    const clienteId = await clienteConAuxiliar();
    const ruta = `/clientes/${clienteId}/historial-laboral/issste`;

    // Sin historial laboral todavía.
    const sinHistorial = await pedir('GET', ruta, t(asesor));
    expect(sinHistorial.estado).toBe(200);
    expect(esVacio(sinHistorial)).toBe(true);

    await pedir('PUT', `/clientes/${clienteId}/historial-laboral`, t(asesor), {
      semanas_issste: 80,
      salario_promedio: 9000,
      ultimo_patron: 'Patrón Ficticio',
      vigencia_derechos: 'no',
    });
    // Con historial pero sin información ISSSTE.
    const sinIssste = await pedir('GET', ruta, t(asesor));
    expect(sinIssste.estado).toBe(200);
    expect(esVacio(sinIssste)).toBe(true);

    // El alta de la información ISSSTE (PUT) aún no está implementada: se inserta directo en la base.
    await ctx.ds.query(
      `INSERT INTO informacion_issste (id, historial_laboral_id, nss_issste, regimen_pensionario, anios_laborados, activo)
       SELECT $1, id, '12345678901', 'Décimo transitorio', 18.5, true
         FROM historial_laboral WHERE cliente_id = $2`,
      [randomUUID(), clienteId],
    );
    await accesos(ruta, (r: { json: Record<string, unknown> }) =>
      expect(r.json).toMatchObject({
        nss_issste: '12345678901',
        regimen_pensionario: 'Décimo transitorio',
        anios_laborados: 18.5,
        activo: true,
      }),
    );
  });

  it('CP-77 objetivos específicos marcados: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; sin datos responde lista vacía', async () => {
    const clienteId = await clienteConAuxiliar();
    const ruta = `/clientes/${clienteId}/objetivos-especificos`;

    const vacio = await pedir('GET', ruta, t(asesor));
    expect(vacio.estado).toBe(200);
    expect(vacio.json).toEqual([]);

    const ids = (
      await ctx.ds.query<{ id: number }[]>(
        'SELECT id FROM objetivo_especifico_inicial ORDER BY id LIMIT 3',
      )
    ).map((f) => f.id);
    expect((await pedir('PUT', ruta, t(asesor), { objetivo_ids: [ids[2], ids[0]] })).estado).toBe(
      200,
    );

    await accesos(ruta, (r: { json: { objetivo_id: number }[] }) =>
      expect(r.json.map((o) => o.objetivo_id)).toEqual([ids[0], ids[2]]),
    );
  });

  it('CP-78 auxiliares del cliente: asesor dueño y supervisor 200; auxiliar 403; asesor ajeno 404; sin auxiliares responde lista vacía', async () => {
    const sinAuxiliares = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const vacio = await pedir('GET', `/clientes/${sinAuxiliares}/auxiliares`, t(asesor));
    expect(vacio.estado).toBe(200);
    expect(vacio.json).toEqual([]);

    const clienteId = await clienteConAuxiliar();
    await accesos(`/clientes/${clienteId}/auxiliares`, (r: { json: Record<string, unknown>[] }) => {
      expect(r.json).toHaveLength(1);
      expect(r.json[0]).toMatchObject({
        cliente_id: clienteId,
        auxiliar_id: auxiliar.id,
        autorizado_por: asesor.id,
        activo: true,
      });
    });
  });

  it('CP-78 la lista de auxiliares incluye también las autorizaciones desactivadas', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const otroAuxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);
    await autorizarEnBd(ctx.ds, clienteId, otroAuxiliar.id, asesor.id, false);

    const r = await pedir('GET', `/clientes/${clienteId}/auxiliares`, t(asesor));
    expect(r.estado).toBe(200);
    const filas = r.json as { auxiliar_id: string; activo: boolean }[];
    expect(filas.map((f) => [f.auxiliar_id, f.activo]).sort()).toEqual(
      [
        [auxiliar.id, true],
        [otroAuxiliar.id, false],
      ].sort(),
    );
  });
});
