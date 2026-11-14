import { randomUUID } from 'node:crypto';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { autorizarEnBd, limpiarDatosClientes } from '../common/testing/datos-clientes';
import { EntornoF1, entornoF1, http } from '../common/testing/f1';

// F1: secciones con su propio recurso (CP-125 a CP-134): recuperación, retroactivo, escenarios, periodos de
// inconsistencias, plan de acción y situación patrimonial con sus hijos. Aplicación real y base de pruebas.
jest.setTimeout(120_000);

const SIN_DIAGNOSTICO = 'Primero crea el diagnóstico especializado (F1).';

type Json = Record<string, unknown>;

describeConBd('F1: secciones del diagnóstico (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let e: EntornoF1;
  const dx = (clienteId: string) => `/clientes/${clienteId}/diagnostico`;
  const asesor = () => e.t(e.asesor);

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    e = await entornoF1(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-125 recuperación de semanas: GET vacío sin análisis; PUT lo crea (aplica obligatorio) y GET lo devuelve; la docs de semanas_imss_reconocidas sigue vigente', async () => {
    const sin = await e.cliente();
    const vacio = await http(ctx, 'GET', `${dx(sin)}/recuperacion-semanas`, asesor());
    expect(vacio.estado).toBe(200);
    expect(vacio.texto.trim()).toBe('');

    const clienteId = await e.clienteConDiagnostico();
    const ruta = `${dx(clienteId)}/recuperacion-semanas`;
    expect((await http(ctx, 'GET', ruta, asesor())).texto.trim()).toBe('');
    const r = await http(ctx, 'PUT', ruta, asesor(), {
      aplica: 'requiere_mas_evidencia',
      observaciones: 'Falta nómina',
    });
    expect(r.estado).toBe(200);
    expect(r.json).toMatchObject({
      aplica: 'requiere_mas_evidencia',
      observaciones: 'Falta nómina',
    });
    expect((await http(ctx, 'GET', ruta, asesor())).json).toEqual(r.json);
    expect((await http(ctx, 'PUT', ruta, asesor(), { aplica: 'quizá' })).estado).toBe(400);
    expect((await http(ctx, 'PUT', ruta, asesor(), {})).estado).toBe(400);
    expect(
      (await http(ctx, 'PUT', `${dx(sin)}/recuperacion-semanas`, asesor(), { aplica: 'si' }))
        .estado,
    ).toBe(409);
  });

  it('CP-126 retroactivo: PUT {} crea el análisis vacío, PUT parcial lo reemplaza, GET lo devuelve (números como número); sin diagnóstico 409; valores inválidos 400', async () => {
    const sin = await e.cliente();
    expect(
      (await http(ctx, 'GET', `${dx(sin)}/modalidad-40-retroactivo`, asesor())).texto.trim(),
    ).toBe('');
    const rechazo = await http(ctx, 'PUT', `${dx(sin)}/modalidad-40-retroactivo`, asesor(), {});
    expect(rechazo.estado).toBe(409);
    expect((rechazo.json as { message: string }).message).toBe(SIN_DIAGNOSTICO);

    const clienteId = await e.clienteConDiagnostico();
    const ruta = `${dx(clienteId)}/modalidad-40-retroactivo`;
    const vacio = await http(ctx, 'PUT', ruta, asesor(), {});
    expect(vacio.estado).toBe(200);
    expect(vacio.json).toMatchObject({
      conclusion_retroactivo: null,
      dentro_de_plazo_reingreso: null,
      total_estimado_pagar: null,
    });
    const lleno = await http(ctx, 'PUT', ruta, asesor(), {
      fecha_propuesta_inicio_m40: '2026-03-01',
      meses_retroactivos_estimados: 6,
      salario_diario_propuesto: 700.5,
      total_estimado_pagar: 12345.67,
      baja_por_mora_previa: false,
      dentro_de_plazo_reingreso: 'requiere_validar',
      conclusion_retroactivo: 'conviene',
    });
    expect(lleno.estado).toBe(200);
    expect(lleno.json).toMatchObject({
      meses_retroactivos_estimados: 6,
      salario_diario_propuesto: 700.5,
      total_estimado_pagar: 12345.67,
      conclusion_retroactivo: 'conviene',
    });
    expect((await http(ctx, 'GET', ruta, asesor())).json).toEqual(lleno.json);
    // PUT reemplaza: lo no enviado vuelve a quedar vacío y el id se conserva.
    const parcial = await http(ctx, 'PUT', ruta, asesor(), { comentarios: 'Solo un comentario' });
    expect(parcial.json).toMatchObject({
      id: (lleno.json as Json).id,
      comentarios: 'Solo un comentario',
      total_estimado_pagar: null,
    });
    for (const cuerpo of [
      { conclusion_retroactivo: 'tal vez' },
      { meses_retroactivos_estimados: 1.5 },
      { salario_diario_propuesto: 1.234 },
      { fecha_solicitud: 'ayer' },
      { cuotas_estimadas: 1e20 },
      { otro: 1 },
    ]) {
      expect({ cuerpo, estado: (await http(ctx, 'PUT', ruta, asesor(), cuerpo)).estado }).toEqual({
        cuerpo,
        estado: 400,
      });
    }
  });

  it('CP-127 escenarios: POST (orden 1 a 3), GET ordenado por orden, PATCH parcial; orden repetido 409; orden fuera de 1 a 3 y valores inválidos 400; otro cliente 404', async () => {
    const sin = await e.cliente();
    expect((await http(ctx, 'GET', `${dx(sin)}/escenarios`, asesor())).json).toEqual([]);
    const rechazo = await http(ctx, 'POST', `${dx(sin)}/escenarios`, asesor(), {
      nombre_escenario: 'Base',
      orden: 1,
    });
    expect(rechazo.estado).toBe(409);

    const clienteId = await e.clienteConDiagnostico();
    const ruta = `${dx(clienteId)}/escenarios`;
    const dos = await http(ctx, 'POST', ruta, asesor(), {
      nombre_escenario: 'Modalidad 10',
      orden: 2,
      meses_modalidad_10: 12,
      semanas_proyectadas: 1000,
      pension_mensual_estimada: 8000.5,
    });
    expect(dos.estado).toBe(201);
    expect(dos.json).toMatchObject({
      orden: 2,
      meses_modalidad_10: 12,
      semanas_proyectadas: 1000,
      pension_mensual_estimada: 8000.5,
      inversion_total_estimada: 0,
    });
    const uno = await http(ctx, 'POST', ruta, asesor(), { nombre_escenario: 'Base', orden: 1 });
    expect(uno.estado).toBe(201);
    expect(uno.json).toMatchObject({
      semanas_proyectadas: null,
      salario_promedio_proyectado: null,
    });
    const tres = await http(ctx, 'POST', ruta, asesor(), { nombre_escenario: 'Mixto', orden: 3 });
    expect(tres.estado).toBe(201);

    expect(((await http(ctx, 'GET', ruta, asesor())).json as Json[]).map((x) => x.orden)).toEqual([
      1, 2, 3,
    ]);
    const repetido = await http(ctx, 'POST', ruta, asesor(), {
      nombre_escenario: 'Otro',
      orden: 2,
    });
    expect(repetido.estado).toBe(409);
    expect((repetido.json as { message: string }).message).toBe(
      'Ya existe un escenario con ese orden.',
    );
    for (const cuerpo of [
      { nombre_escenario: 'x', orden: 4 },
      { nombre_escenario: 'x', orden: 0 },
      { nombre_escenario: 'x', orden: 1.5 },
      { orden: 1 },
      { nombre_escenario: '', orden: 1 },
      { nombre_escenario: 'x', orden: 1, pension_mensual_estimada: 1.234 },
      { nombre_escenario: 'x', orden: 1, meses_modalidad_10: 99999 },
      { nombre_escenario: 'x', orden: 1, diagnostico_f1_id: randomUUID() },
    ]) {
      expect({ cuerpo, estado: (await http(ctx, 'POST', ruta, asesor(), cuerpo)).estado }).toEqual({
        cuerpo,
        estado: 400,
      });
    }

    const id = (uno.json as Json).id as string;
    const cambio = await http(ctx, 'PATCH', `${ruta}/${id}`, asesor(), {
      incremento_mensual: 1500.25,
      meses_modalidad_40: 24,
      nombre_escenario: 'Base (ajustada)',
    });
    expect(cambio.estado).toBe(200);
    expect(cambio.json).toMatchObject({
      id,
      orden: 1,
      incremento_mensual: 1500.25,
      meses_modalidad_40: 24,
      nombre_escenario: 'Base (ajustada)',
    });
    expect((await http(ctx, 'PATCH', `${ruta}/${id}`, asesor(), { orden: 2 })).estado).toBe(409);
    expect((await http(ctx, 'PATCH', `${ruta}/${id}`, asesor(), { orden: 9 })).estado).toBe(400);
    expect(
      (await http(ctx, 'PATCH', `${ruta}/${id}`, asesor(), { diagnostico_f1_id: randomUUID() }))
        .estado,
    ).toBe(400);
    expect((await http(ctx, 'PATCH', `${ruta}/${id}`, asesor(), {})).estado).toBe(200);
    // Un escenario de otro cliente no se alcanza por esta ruta.
    const otro = await e.clienteConDiagnostico();
    expect(
      (await http(ctx, 'PATCH', `${dx(otro)}/escenarios/${id}`, asesor(), { orden: 3 })).estado,
    ).toBe(404);
    expect((await http(ctx, 'PATCH', `${ruta}/${randomUUID()}`, asesor(), {})).estado).toBe(404);
    expect((await http(ctx, 'PATCH', `${ruta}/no-es-uuid`, asesor(), {})).estado).toBe(400);
  });

  it('CP-128 periodos de inconsistencias: POST, GET en orden de captura, PATCH parcial, DELETE 204; otro cliente 404; inválidos 400', async () => {
    const clienteId = await e.cliente();
    const ruta = `/clientes/${clienteId}/periodos-inconsistencias`;
    expect((await http(ctx, 'GET', ruta, asesor())).json).toEqual([]);
    const cuerpo = (n: number) => ({
      nombre_patron: `Patrón ${n}`,
      periodo_reclamado: `2019-0${n}`,
      semanas_esperadas: 10 + n,
      evidencia_disponible: 'Recibos',
      accion_sugerida: 'Aclarar',
    });
    const a = await http(ctx, 'POST', ruta, asesor(), cuerpo(1));
    expect(a.estado).toBe(201);
    expect(a.json).toMatchObject({
      cliente_id: clienteId,
      semanas_reconocidas: 0,
      estatus: 'pendiente',
    });
    const b = await http(ctx, 'POST', ruta, asesor(), {
      ...cuerpo(2),
      semanas_reconocidas: 3,
      estatus: 'en_tramite',
    });
    expect(b.estado).toBe(201);
    const lista = (await http(ctx, 'GET', ruta, asesor())).json as Json[];
    expect(lista.map((x) => x.nombre_patron)).toEqual(['Patrón 1', 'Patrón 2']);

    const id = (a.json as Json).id as string;
    const cambio = await http(ctx, 'PATCH', `${ruta}/${id}`, asesor(), {
      semanas_reconocidas: 5,
      estatus: 'recuperado',
    });
    expect(cambio.json).toMatchObject({
      id,
      semanas_reconocidas: 5,
      estatus: 'recuperado',
      nombre_patron: 'Patrón 1',
    });
    for (const inv of [
      { estatus: 'quizá' },
      { semanas_esperadas: -1 },
      { semanas_esperadas: 1.5 },
      { cliente_id: randomUUID() },
      { nombre_patron: 7 },
    ]) {
      expect({
        inv,
        estado: (await http(ctx, 'PATCH', `${ruta}/${id}`, asesor(), inv)).estado,
      }).toEqual({ inv, estado: 400 });
    }
    for (const inv of [
      {},
      { ...cuerpo(3), estatus: 'x' },
      { ...cuerpo(3), semanas_esperadas: 'diez' },
      { ...cuerpo(3), otro: 1 },
    ]) {
      expect({ inv, estado: (await http(ctx, 'POST', ruta, asesor(), inv)).estado }).toEqual({
        inv,
        estado: 400,
      });
    }
    const otro = await e.cliente();
    expect(
      (await http(ctx, 'PATCH', `/clientes/${otro}/periodos-inconsistencias/${id}`, asesor(), {}))
        .estado,
    ).toBe(404);
    expect(
      (await http(ctx, 'DELETE', `/clientes/${otro}/periodos-inconsistencias/${id}`, asesor()))
        .estado,
    ).toBe(404);
    const borrado = await http(ctx, 'DELETE', `${ruta}/${id}`, asesor());
    expect(borrado.estado).toBe(204);
    expect(
      ((await http(ctx, 'GET', ruta, asesor())).json as Json[]).map((x) => x.nombre_patron),
    ).toEqual(['Patrón 2']);
    expect((await http(ctx, 'DELETE', `${ruta}/${id}`, asesor())).estado).toBe(404);
  });

  it('CP-129 plan de acción: POST (estatus por omisión pendiente), GET en orden de captura, PATCH parcial, DELETE 204; sin diagnóstico 409; otro cliente 404; inválidos 400', async () => {
    const sin = await e.cliente();
    expect((await http(ctx, 'GET', `${dx(sin)}/plan-accion`, asesor())).json).toEqual([]);
    expect(
      (await http(ctx, 'POST', `${dx(sin)}/plan-accion`, asesor(), { accion: 'x' })).estado,
    ).toBe(409);

    const clienteId = await e.clienteConDiagnostico();
    const ruta = `${dx(clienteId)}/plan-accion`;
    const a = await http(ctx, 'POST', ruta, asesor(), {
      accion: 'Solicitar constancia',
      fecha_objetivo: '2026-12-01',
    });
    expect(a.estado).toBe(201);
    expect(a.json).toMatchObject({
      accion: 'Solicitar constancia',
      fecha_objetivo: '2026-12-01',
      estatus: 'pendiente',
      observaciones: null,
    });
    const b = await http(ctx, 'POST', ruta, asesor(), {
      accion: 'Aclarar semanas',
      estatus: 'en_proceso',
      observaciones: 'Con el IMSS',
    });
    expect(b.estado).toBe(201);
    expect(((await http(ctx, 'GET', ruta, asesor())).json as Json[]).map((x) => x.accion)).toEqual([
      'Solicitar constancia',
      'Aclarar semanas',
    ]);

    const id = (a.json as Json).id as string;
    const cambio = await http(ctx, 'PATCH', `${ruta}/${id}`, asesor(), {
      estatus: 'hecho',
      observaciones: null,
      fecha_objetivo: null,
    });
    expect(cambio.json).toMatchObject({
      id,
      estatus: 'hecho',
      observaciones: null,
      fecha_objetivo: null,
      accion: 'Solicitar constancia',
    });
    for (const inv of [
      { estatus: 'quizá' },
      { accion: '' },
      { fecha_objetivo: 'ayer' },
      { diagnostico_id: randomUUID() },
      { accion: null },
    ]) {
      expect({
        inv,
        estado: (await http(ctx, 'PATCH', `${ruta}/${id}`, asesor(), inv)).estado,
      }).toEqual({ inv, estado: 400 });
    }
    for (const inv of [
      {},
      { accion: '' },
      { accion: 'x', estatus: 'y' },
      { accion: 'x', otro: 1 },
    ]) {
      expect({ inv, estado: (await http(ctx, 'POST', ruta, asesor(), inv)).estado }).toEqual({
        inv,
        estado: 400,
      });
    }
    const otro = await e.clienteConDiagnostico();
    expect((await http(ctx, 'PATCH', `${dx(otro)}/plan-accion/${id}`, asesor(), {})).estado).toBe(
      404,
    );
    expect((await http(ctx, 'DELETE', `${dx(otro)}/plan-accion/${id}`, asesor())).estado).toBe(404);
    expect((await http(ctx, 'DELETE', `${ruta}/${id}`, asesor())).estado).toBe(204);
    expect(((await http(ctx, 'GET', ruta, asesor())).json as Json[]).map((x) => x.accion)).toEqual([
      'Aclarar semanas',
    ]);
    expect((await http(ctx, 'DELETE', `${ruta}/no-es-uuid`, asesor())).estado).toBe(400);
  });

  it('CP-130 situación patrimonial: GET vacío sin registro; PUT todo opcional (reemplaza, números como número); sin diagnóstico 409; inválidos 400', async () => {
    const sin = await e.cliente();
    expect(
      (await http(ctx, 'GET', `${dx(sin)}/situacion-patrimonial`, asesor())).texto.trim(),
    ).toBe('');
    expect((await http(ctx, 'PUT', `${dx(sin)}/situacion-patrimonial`, asesor(), {})).estado).toBe(
      409,
    );

    const clienteId = await e.clienteConDiagnostico();
    const ruta = `${dx(clienteId)}/situacion-patrimonial`;
    expect((await http(ctx, 'GET', ruta, asesor())).texto.trim()).toBe('');
    const vacia = await http(ctx, 'PUT', ruta, asesor(), {});
    expect(vacia.estado).toBe(200);
    expect(vacia.json).toMatchObject({
      saldo_cuenta_individual: null,
      estado_salud: null,
      estado_civil: null,
    });
    const llena = await http(ctx, 'PUT', ruta, asesor(), {
      saldo_cuenta_individual: 250000.5,
      ingreso_mensual: 18000,
      estado_salud: 'regular',
      estado_civil: 'casado',
      edad_conyuge: 58,
      padecimientos: 'Ninguno',
      bienes_patrimoniales: 'Casa propia',
    });
    expect(llena.estado).toBe(200);
    expect(llena.json).toMatchObject({
      id: (vacia.json as Json).id,
      saldo_cuenta_individual: 250000.5,
      ingreso_mensual: 18000,
      estado_salud: 'regular',
      estado_civil: 'casado',
      edad_conyuge: 58,
    });
    expect((await http(ctx, 'GET', ruta, asesor())).json).toEqual(llena.json);
    const reemplazo = await http(ctx, 'PUT', ruta, asesor(), { seguros: 'GMM' });
    expect(reemplazo.json).toMatchObject({
      seguros: 'GMM',
      saldo_cuenta_individual: null,
      estado_civil: null,
    });
    for (const cuerpo of [
      { estado_salud: 'pésimo' },
      { estado_civil: 'unión libre' },
      { saldo_cuenta_individual: -1 },
      { saldo_cuenta_individual: 1.234 },
      { ingreso_mensual: 1e15 },
      { edad_conyuge: 200 },
      { edad_conyuge: -1 },
      { seguros: 5 },
      { diagnostico_f1_id: randomUUID() },
    ]) {
      expect({ cuerpo, estado: (await http(ctx, 'PUT', ruta, asesor(), cuerpo)).estado }).toEqual({
        cuerpo,
        estado: 400,
      });
    }
  });

  it('CP-131 hijos: una fila por hijo; GET [], POST agrega, PUT reemplaza la lista; sin situación patrimonial 409; inválidos 400', async () => {
    const clienteId = await e.clienteConDiagnostico();
    const ruta = `${dx(clienteId)}/situacion-patrimonial/hijos`;
    expect((await http(ctx, 'GET', ruta, asesor())).json).toEqual([]);
    const rechazo = await http(ctx, 'POST', ruta, asesor(), { edad: 10 });
    expect(rechazo.estado).toBe(409);
    expect((rechazo.json as { message: string }).message).toBe(
      'Primero registra la situación patrimonial.',
    );
    expect((await http(ctx, 'PUT', ruta, asesor(), { items: [] })).estado).toBe(409);

    await http(ctx, 'PUT', `${dx(clienteId)}/situacion-patrimonial`, asesor(), {});
    const uno = await http(ctx, 'POST', ruta, asesor(), { edad: 12 });
    expect(uno.estado).toBe(201);
    expect(uno.json).toMatchObject({ edad: 12, tiene_discapacidad: false });
    expect(uno.json).not.toHaveProperty('numero_hijos');
    const dos = await http(ctx, 'POST', ruta, asesor(), { edad: 7, tiene_discapacidad: true });
    expect(dos.estado).toBe(201);
    const lista = (await http(ctx, 'GET', ruta, asesor())).json as Json[];
    expect(lista.map((h) => [h.edad, h.tiene_discapacidad])).toEqual([
      [12, false],
      [7, true],
    ]);

    const reemplazo = await http(ctx, 'PUT', ruta, asesor(), {
      items: [{ edad: 30 }, { edad: 25, tiene_discapacidad: true }, { edad: 3 }],
    });
    expect(reemplazo.estado).toBe(200);
    expect((reemplazo.json as Json[]).map((h) => h.edad)).toEqual([30, 25, 3]);
    expect((reemplazo.json as Json[]).length).toBe(3);
    expect((await http(ctx, 'PUT', ruta, asesor(), { items: [] })).json).toEqual([]);

    for (const cuerpo of [
      {},
      { edad: -1 },
      { edad: 150 },
      { edad: 1.5 },
      { edad: 5, tiene_discapacidad: 'si' },
      { edad: 5, numero_hijos: 3 },
      { edad: 5, situacion_patrimonial_id: randomUUID() },
    ]) {
      expect({ cuerpo, estado: (await http(ctx, 'POST', ruta, asesor(), cuerpo)).estado }).toEqual({
        cuerpo,
        estado: 400,
      });
    }
    for (const items of [
      undefined,
      'texto',
      [{}],
      [{ edad: -1 }],
      [{ edad: 5, otro: 1 }],
      [5],
      Array.from({ length: 101 }, () => ({ edad: 1 })),
    ]) {
      const r = await http(ctx, 'PUT', ruta, asesor(), items === undefined ? {} : { items });
      expect({ items: JSON.stringify(items)?.slice(0, 30), estado: r.estado }).toEqual({
        items: JSON.stringify(items)?.slice(0, 30),
        estado: 400,
      });
    }
  });

  it('CP-141 escenarios: DELETE responde 204 y lo quita; otro cliente, inexistente 404, id inválido 400; roles; borrar libera el orden', async () => {
    const clienteId = await e.clienteConDiagnostico();
    const ruta = `${dx(clienteId)}/escenarios`;
    const uno = (await http(ctx, 'POST', ruta, asesor(), { nombre_escenario: 'Base', orden: 1 }))
      .json as Json;
    const dos = (await http(ctx, 'POST', ruta, asesor(), { nombre_escenario: 'Mixto', orden: 2 }))
      .json as Json;

    // Otro cliente, inexistente e id inválido: nada se borra.
    const otro = await e.clienteConDiagnostico();
    expect((await http(ctx, 'DELETE', `${dx(otro)}/escenarios/${uno.id}`, asesor())).estado).toBe(
      404,
    );
    expect((await http(ctx, 'DELETE', `${ruta}/${randomUUID()}`, asesor())).estado).toBe(404);
    expect((await http(ctx, 'DELETE', `${ruta}/no-es-uuid`, asesor())).estado).toBe(400);
    expect(((await http(ctx, 'GET', ruta, asesor())).json as Json[]).length).toBe(2);

    // Roles: supervisor y auxiliar (aun autorizado) 403, sin token 401, asesor ajeno 404, cliente inexistente 404.
    await autorizarEnBd(ctx.ds, clienteId, e.auxiliar.id, e.asesor.id, true);
    const url = `${ruta}/${uno.id}`;
    expect({
      supervisor: (await http(ctx, 'DELETE', url, e.t(e.supervisor))).estado,
      auxiliar: (await http(ctx, 'DELETE', url, e.t(e.auxiliar))).estado,
      sinToken: (await http(ctx, 'DELETE', url)).estado,
      ajeno: (await http(ctx, 'DELETE', url, e.t(e.otroAsesor))).estado,
      inexistente: (await http(ctx, 'DELETE', `${dx(randomUUID())}/escenarios/${uno.id}`, asesor()))
        .estado,
    }).toEqual({ supervisor: 403, auxiliar: 403, sinToken: 401, ajeno: 404, inexistente: 404 });
    expect(((await http(ctx, 'GET', ruta, asesor())).json as Json[]).length).toBe(2);

    const borrado = await http(ctx, 'DELETE', url, asesor());
    expect(borrado.estado).toBe(204);
    expect(borrado.texto).toBe('');
    expect(((await http(ctx, 'GET', ruta, asesor())).json as Json[]).map((x) => x.id)).toEqual([
      dos.id,
    ]);
    expect((await http(ctx, 'DELETE', url, asesor())).estado).toBe(404);
    // Libera el orden 1: se puede volver a crear.
    expect(
      (await http(ctx, 'POST', ruta, asesor(), { nombre_escenario: 'Otra vez', orden: 1 })).estado,
    ).toBe(201);
  });

  it('CP-132 roles en las rutas de este grupo: asesor dueño bien; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404', async () => {
    const clienteId = await e.clienteConDiagnostico();
    await http(ctx, 'PUT', `${dx(clienteId)}/situacion-patrimonial`, asesor(), {});
    await autorizarEnBd(ctx.ds, clienteId, e.auxiliar.id, e.asesor.id, true);
    const plan = (
      await http(ctx, 'POST', `${dx(clienteId)}/plan-accion`, asesor(), { accion: 'x' })
    ).json as Json;
    const periodo = (
      await http(ctx, 'POST', `/clientes/${clienteId}/periodos-inconsistencias`, asesor(), {
        nombre_patron: 'p',
        periodo_reclamado: '2020',
        semanas_esperadas: 1,
        evidencia_disponible: 'e',
        accion_sugerida: 'a',
      })
    ).json as Json;
    const escenario = (
      await http(ctx, 'POST', `${dx(clienteId)}/escenarios`, asesor(), {
        nombre_escenario: 'Base',
        orden: 1,
      })
    ).json as Json;
    const rutas: [string, string, object | undefined][] = [
      ['GET', `${dx(clienteId)}/recuperacion-semanas`, undefined],
      ['PUT', `${dx(clienteId)}/recuperacion-semanas`, { aplica: 'si' }],
      ['GET', `${dx(clienteId)}/modalidad-40-retroactivo`, undefined],
      ['PUT', `${dx(clienteId)}/modalidad-40-retroactivo`, {}],
      ['GET', `${dx(clienteId)}/escenarios`, undefined],
      ['POST', `${dx(clienteId)}/escenarios`, { nombre_escenario: 'Dos', orden: 2 }],
      ['PATCH', `${dx(clienteId)}/escenarios/${escenario.id}`, {}],
      ['GET', `/clientes/${clienteId}/periodos-inconsistencias`, undefined],
      ['PATCH', `/clientes/${clienteId}/periodos-inconsistencias/${periodo.id}`, {}],
      ['GET', `${dx(clienteId)}/plan-accion`, undefined],
      ['PATCH', `${dx(clienteId)}/plan-accion/${plan.id}`, {}],
      ['GET', `${dx(clienteId)}/situacion-patrimonial`, undefined],
      ['PUT', `${dx(clienteId)}/situacion-patrimonial`, {}],
      ['GET', `${dx(clienteId)}/situacion-patrimonial/hijos`, undefined],
      ['POST', `${dx(clienteId)}/situacion-patrimonial/hijos`, { edad: 5 }],
      ['PUT', `${dx(clienteId)}/situacion-patrimonial/hijos`, { items: [] }],
      ['DELETE', `${dx(clienteId)}/plan-accion/${plan.id}`, undefined],
      ['DELETE', `/clientes/${clienteId}/periodos-inconsistencias/${periodo.id}`, undefined],
    ];
    const fallos: unknown[] = [];
    for (const [metodo, url, cuerpo] of rutas) {
      const intentos = {
        supervisor: (await http(ctx, metodo, url, e.t(e.supervisor), cuerpo)).estado,
        auxiliar: (await http(ctx, metodo, url, e.t(e.auxiliar), cuerpo)).estado,
        sinToken: (await http(ctx, metodo, url, undefined, cuerpo)).estado,
        ajeno: (await http(ctx, metodo, url, e.t(e.otroAsesor), cuerpo)).estado,
        inexistente: (
          await http(ctx, metodo, url.replace(clienteId, randomUUID()), asesor(), cuerpo)
        ).estado,
      };
      const dueno = (await http(ctx, metodo, url, asesor(), cuerpo)).estado;
      if (
        JSON.stringify(Object.values(intentos)) !== JSON.stringify([403, 403, 401, 404, 404]) ||
        dueno >= 400
      ) {
        fallos.push({ metodo, url, dueno, ...intentos });
      }
    }
    expect(fallos).toEqual([]);
  });

  it('CP-133 ninguna entrada responde 500 en las rutas de este grupo: cuerpos que no son objeto, JSON roto, valores extremos y NUL', async () => {
    const clienteId = await e.clienteConDiagnostico();
    await http(ctx, 'PUT', `${dx(clienteId)}/situacion-patrimonial`, asesor(), {});
    const plan = (
      await http(ctx, 'POST', `${dx(clienteId)}/plan-accion`, asesor(), { accion: 'x' })
    ).json as Json;
    const objetivos: [string, string][] = [
      ['PUT', `${dx(clienteId)}/recuperacion-semanas`],
      ['PUT', `${dx(clienteId)}/modalidad-40-retroactivo`],
      ['POST', `${dx(clienteId)}/escenarios`],
      ['POST', `/clientes/${clienteId}/periodos-inconsistencias`],
      ['POST', `${dx(clienteId)}/plan-accion`],
      ['PATCH', `${dx(clienteId)}/plan-accion/${plan.id}`],
      ['PUT', `${dx(clienteId)}/situacion-patrimonial`],
      ['POST', `${dx(clienteId)}/situacion-patrimonial/hijos`],
    ];
    const resultados: { caso: string; estado: number }[] = [];
    for (const [metodo, url] of objetivos) {
      for (const crudo of ['', '{', 'null', '[]', '"texto"', '123']) {
        resultados.push({
          caso: `${metodo} ${url} ${crudo}`,
          estado: (await http(ctx, metodo, url, asesor(), undefined, crudo)).estado,
        });
      }
      for (const cuerpo of [
        {
          accion: 'a\u0000b',
          nombre_escenario: 'a\u0000b',
          nombre_patron: 'a\u0000b',
          observaciones: 'a\u0000b',
          comentarios: 'a\u0000b',
          seguros: 'a\u0000b',
          aplica: 'si',
          orden: 1,
          edad: 5,
        },
        { accion: 'x'.repeat(200_000), aplica: 'si' },
      ]) {
        resultados.push({
          caso: `${metodo} ${url} NUL/enorme`,
          estado: (await http(ctx, metodo, url, asesor(), cuerpo)).estado,
        });
      }
    }
    for (const { caso, estado } of resultados) {
      expect({ caso, quinientos: estado >= 500 }).toEqual({ caso, quinientos: false });
    }
  });
});
