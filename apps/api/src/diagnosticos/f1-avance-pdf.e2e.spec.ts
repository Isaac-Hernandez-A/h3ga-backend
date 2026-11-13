import { randomUUID } from 'node:crypto';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  cuerpoCliente,
  ID_ESTATUS,
  limpiarDatosClientes,
} from '../common/testing/datos-clientes';
import { EntornoF1, entornoF1, http } from '../common/testing/f1';
import { textoDePdf } from '../common/testing/texto-de-pdf';

// F1: avance de la etapa 1 al guardar (CP-134 a CP-136) y PDF del formato (CP-137 a CP-140). Aplicación real
// y base de pruebas.
jest.setTimeout(180_000);

type Json = Record<string, unknown>;

// Regla de avance documentada en docs/arquitectura.md: 13 secciones capturables; con al menos una completa,
// la etapa 1 pasa de Por iniciar a En proceso asesor y su avance es 20 + 70 x completas / 13 (entero hacia
// abajo), de 25 % a 90 %.
const avanceEsperado = (completas: number) => 20 + Math.floor((70 * completas) / 13);

describeConBd('F1: avance de la etapa 1 y PDF (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let e: EntornoF1;
  const asesor = () => e.t(e.asesor);
  const dx = (clienteId: string) => `/clientes/${clienteId}/diagnostico`;

  // Cliente creado por la API: trae sus 16 etapas.
  async function clienteConEtapas(): Promise<string> {
    const r = await http(ctx, 'POST', '/clientes', asesor(), cuerpoCliente(e.catalogo));
    expect(r.estado).toBe(201);
    return (r.json as Json).id as string;
  }
  async function etapa1(clienteId: string): Promise<Json> {
    const r = await http(ctx, 'GET', `/clientes/${clienteId}/etapas`, asesor());
    return (r.json as { etapas: Json[] }).etapas.find((x) => x.numero_paso === 1) as Json;
  }
  const put = (clienteId: string, ruta: string, cuerpo: unknown) =>
    http(ctx, 'PUT', `${dx(clienteId)}/${ruta}`, asesor(), cuerpo);
  const patch = (clienteId: string, cuerpo: unknown) =>
    http(ctx, 'PATCH', dx(clienteId), asesor(), cuerpo);

  // Las 13 secciones capturables, una por una (devuelven la ruta/cuerpo para completarla).
  const SECCIONES: ((clienteId: string) => Promise<unknown>)[] = [
    (c) => put(c, 'objetivos', { items: [{ objetivo_id: 1 }] }),
    (c) => put(c, 'documentos', { items: [{ tipo_documento_id: 1, recibido: true }] }),
    (c) =>
      patch(c, {
        tipo_pension_probable: 'cesantia',
        edad_objetivo_pension: 60,
        cotizo_antes_julio_1997: true,
      }),
    (c) => patch(c, { semanas_efectivas_pension: 900 }),
    (c) =>
      patch(c, {
        tiene_conservacion_derechos: 'si',
        dentro_de_conservacion: 'si',
        conviene_pensionar_ahora: 'no',
      }),
    (c) => put(c, 'recuperacion-semanas', { aplica: 'no' }),
    (c) => patch(c, { conclusion_modalidad_10: 'aplica' }),
    (c) => patch(c, { conclusion_modalidad_40: 'aplica', dado_de_baja_regimen_obligatorio: 'si' }),
    (c) => put(c, 'modalidad-40-retroactivo', { conclusion_retroactivo: 'conviene' }),
    (c) =>
      http(ctx, 'POST', `${dx(c)}/escenarios`, asesor(), { nombre_escenario: 'Base', orden: 1 }),
    (c) => put(c, 'situacion-patrimonial', { ingreso_mensual: 10000 }),
    async (c) => {
      await put(c, 'estrategias-recomendadas', { items: [{ estrategia_id: 1 }] });
      return patch(c, { justificacion_estrategia: 'Conviene esperar' });
    },
    (c) => http(ctx, 'POST', `${dx(c)}/plan-accion`, asesor(), { accion: 'Pedir constancia' }),
  ];

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    e = await entornoF1(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-134 avance: un diagnóstico vacío no mueve la etapa 1; con la primera sección completa pasa a En proceso asesor (25 %) y deja su fila en la bitácora; cada sección completa suma hasta 90 %', async () => {
    const clienteId = await clienteConEtapas();
    const inicial = await etapa1(clienteId);
    expect(inicial.estatus_id).toBe(ID_ESTATUS['Por iniciar']);

    expect((await http(ctx, 'POST', dx(clienteId), asesor(), {})).estado).toBe(201);
    expect(await etapa1(clienteId)).toMatchObject({
      estatus_id: ID_ESTATUS['Por iniciar'],
      avance_porcentaje: inicial.avance_porcentaje,
    });
    expect((await http(ctx, 'GET', dx(clienteId), asesor())).estado).toBe(200);
    expect(await etapa1(clienteId)).toMatchObject({ estatus_id: ID_ESTATUS['Por iniciar'] });

    let completas = 0;
    for (const seccion of SECCIONES) {
      await seccion(clienteId);
      completas += 1;
      expect(await etapa1(clienteId)).toMatchObject({
        estatus_id: ID_ESTATUS['En proceso asesor'],
        avance_porcentaje: avanceEsperado(completas),
      });
    }
    expect(avanceEsperado(1)).toBe(25);
    expect(avanceEsperado(13)).toBe(90);

    // Un solo cambio de estatus en la bitácora: Por iniciar -> En proceso asesor, hecho por el asesor.
    const bitacora = await ctx.ds.query<Json[]>(
      `SELECT h.* FROM etapas_tramite_historial h JOIN etapas_tramite et ON et.id = h.etapa_tramite_id
        WHERE h.etapa_tramite_id = $1`,
      [inicial.id],
    );
    expect(bitacora).toHaveLength(1);
    expect(bitacora[0]).toMatchObject({
      estatus_anterior_id: ID_ESTATUS['Por iniciar'],
      estatus_nuevo_id: ID_ESTATUS['En proceso asesor'],
      cambiado_por: e.asesor.id,
    });
  });

  it('CP-135 avance: si una sección deja de estar completa, el avance baja; borrar es tan válido como guardar', async () => {
    const clienteId = await clienteConEtapas();
    await http(ctx, 'POST', dx(clienteId), asesor(), {});
    for (const seccion of SECCIONES.slice(0, 4)) await seccion(clienteId);
    expect(await etapa1(clienteId)).toMatchObject({ avance_porcentaje: avanceEsperado(4) });
    await put(clienteId, 'objetivos', { items: [] });
    expect(await etapa1(clienteId)).toMatchObject({ avance_porcentaje: avanceEsperado(3) });
    await patch(clienteId, { semanas_efectivas_pension: null });
    expect(await etapa1(clienteId)).toMatchObject({ avance_porcentaje: avanceEsperado(2) });
  });

  it('CP-136 avance: no toca una etapa Finalizada ni un cliente sin etapas, y un guardado sin etapa 1 no falla', async () => {
    const clienteId = await clienteConEtapas();
    await http(ctx, 'POST', dx(clienteId), asesor(), {});
    await SECCIONES[2](clienteId);
    const etapa = await etapa1(clienteId);
    const finalizar = await http(
      ctx,
      'PATCH',
      `/clientes/${clienteId}/etapas/${etapa.id}`,
      asesor(),
      { estatus_id: ID_ESTATUS['Finalizado'] },
    );
    expect(finalizar.estado).toBe(200);
    await SECCIONES[3](clienteId);
    await SECCIONES[6](clienteId);
    expect(await etapa1(clienteId)).toMatchObject({
      estatus_id: ID_ESTATUS['Finalizado'],
      avance_porcentaje: 100,
    });

    // Cliente sin etapas (insertado directo en la base): guardar el F1 funciona igual.
    const sinEtapas = await e.cliente();
    expect((await http(ctx, 'POST', dx(sinEtapas), asesor(), {})).estado).toBe(201);
    expect(
      ((await patch(sinEtapas, { edad_objetivo_pension: 60 })) as { estado: number }).estado,
    ).toBe(200);
  });

  it('CP-142 avance: quitar el último escenario hace que la sección deje de estar completa y el avance baja', async () => {
    const clienteId = await clienteConEtapas();
    await http(ctx, 'POST', dx(clienteId), asesor(), {});
    await SECCIONES[2](clienteId);
    const escenario = (await SECCIONES[9](clienteId)) as { json: Json };
    expect(await etapa1(clienteId)).toMatchObject({ avance_porcentaje: avanceEsperado(2) });
    const r = await http(
      ctx,
      'DELETE',
      `${dx(clienteId)}/escenarios/${escenario.json.id}`,
      asesor(),
    );
    expect(r.estado).toBe(204);
    expect(await etapa1(clienteId)).toMatchObject({ avance_porcentaje: avanceEsperado(1) });
  });

  // ---------------- PDF ----------------

  const rutaPdf = (clienteId: string) => `${dx(clienteId)}/pdf`;

  // Diagnóstico con todo lo que exige el formato (los 12 campos que antes eran NOT NULL) y datos de cada sección.
  async function clienteCompleto(): Promise<string> {
    const clienteId = await clienteConEtapas();
    await http(ctx, 'POST', dx(clienteId), asesor(), {});
    expect(
      (
        (await patch(clienteId, {
          fecha_primera_cotizacion: '1995-03-01',
          cotizo_antes_julio_1997: true,
          tipo_pension_probable: 'cesantia',
          edad_objetivo_pension: 60,
          comentarios_cliente: 'Quiere retirarse pronto',
          observaciones_regimen: 'Régimen Ley 73 probable',
          fecha_ultima_baja: '2024-01-15',
          ultimo_salario_cotizado: 450.5,
          fecha_vencimiento_conservacion: '2029-01-15',
          tiene_conservacion_derechos: 'si',
          tiempo_estimado_conservacion_meses: 50,
          dentro_de_conservacion: 'si',
          requiere_reactivacion: false,
          conviene_pensionar_ahora: 'depende_escenario',
          comentarios_conservacion: 'Comentario de conservación ficticio',
          semanas_reconocidas_al_baja: 1000,
          semanas_descontadas: 20,
          semanas_reintegradas: 10,
          semanas_efectivas_pension: 990,
          semanas_requeridas_pension: 1250,
          trabaja_cuenta_propia: 'parcialmente',
          actividad_economica: 'Comercio ficticio',
          ingreso_mensual_aproximado: 9000,
          conclusion_modalidad_10: 'temporal',
          comentarios_modalidad_10: 'Comentario M10 ficticio',
          dado_de_baja_regimen_obligatorio: 'si',
          conclusion_modalidad_40: 'aplica',
          salario_propuesto_m40: 1500,
          meses_propuestos_m40: 24,
          evalua_retroactivo_m40: true,
          comentarios_modalidad_40: 'Comentario M40 ficticio',
          justificacion_estrategia: 'Justificación ficticia de la estrategia',
          siguiente_paso_sugerido: 'Siguiente paso ficticio',
          conclusion_financiera: 'Conclusión financiera ficticia',
        })) as { estado: number }
      ).estado,
    ).toBe(200);
    await put(clienteId, 'objetivos', {
      items: [{ objetivo_id: 1 }, { objetivo_id: 12, detalle_otro: 'Objetivo propio ficticio' }],
    });
    await put(clienteId, 'documentos', {
      items: [
        { tipo_documento_id: 1, recibido: true, observaciones: 'Constancia vigente' },
        { tipo_documento_id: 2, recibido: false },
      ],
    });
    await put(clienteId, 'inconsistencias-generales', { items: [{ tipo_id: 1 }] });
    await put(clienteId, 'recuperacion-semanas', {
      aplica: 'si',
      observaciones: 'Observación de recuperación ficticia',
    });
    await put(clienteId, 'recuperacion-gestiones', { items: [{ tipo_gestion_id: 1 }] });
    await put(clienteId, 'recuperacion-evidencias', { items: [{ tipo_evidencia_id: 1 }] });
    await put(clienteId, 'objetivos-modalidad-10', { items: [{ objetivo_id: 1 }] });
    await put(clienteId, 'criterios-modalidad-10', {
      items: [{ criterio: 'Tiene actividad independiente real', cumple: true }],
    });
    await put(clienteId, 'objetivos-modalidad-40', { items: [{ objetivo_id: 1 }] });
    await put(clienteId, 'criterios-modalidad-40', {
      items: [{ criterio: 'Cuenta con baja del régimen obligatorio', cumplimiento: 'cumple' }],
    });
    await put(clienteId, 'modalidad-40-retroactivo', {
      meses_retroactivos_estimados: 6,
      total_estimado_pagar: 54321.5,
      dentro_de_plazo_reingreso: 'si',
      conclusion_retroactivo: 'conviene',
      comentarios: 'Comentario retroactivo ficticio',
    });
    await put(clienteId, 'conveniencia-retroactivo', {
      items: [{ pregunta: '¿El retroactivo mejora salario promedio?', respuesta: true }],
    });
    await http(ctx, 'POST', `${dx(clienteId)}/escenarios`, asesor(), {
      nombre_escenario: 'Escenario Base Ficticio',
      orden: 1,
      semanas_proyectadas: 1000,
      salario_promedio_proyectado: 450,
      inversion_total_estimada: 120000,
      pension_mensual_estimada: 9000,
      incremento_mensual: 1500,
      meses_recuperacion_inversion: 80,
    });
    await put(clienteId, 'situacion-patrimonial', {
      saldo_cuenta_individual: 250000,
      aportaciones_voluntarias: 0,
      ahorros_inversiones_adicionales: 10000,
      bienes_patrimoniales: 'Casa ficticia',
      creditos_deudas_vigentes: 'Ninguno',
      ingreso_mensual: 18000,
      otras_fuentes_ingreso: 'Renta ficticia',
      ingreso_conyuge: 12000,
      seguros: 'GMM ficticio',
      estado_salud: 'bueno',
      padecimientos: 'Ninguno',
      estado_civil: 'casado',
      edad_conyuge: 57,
      actividad_economica_conyuge: 'Docente',
    });
    await put(clienteId, 'situacion-patrimonial/hijos', {
      items: [{ edad: 30 }, { edad: 25, tiene_discapacidad: true }],
    });
    await put(clienteId, 'estrategias-recomendadas', { items: [{ estrategia_id: 4 }] });
    await http(ctx, 'POST', `${dx(clienteId)}/plan-accion`, asesor(), {
      accion: 'Acción del plan ficticia',
      fecha_objetivo: '2026-12-15',
    });
    await http(ctx, 'POST', `/clientes/${clienteId}/periodos-inconsistencias`, asesor(), {
      nombre_patron: 'Patrón Periodo Ficticio',
      periodo_reclamado: '2018-2019',
      semanas_esperadas: 52,
      evidencia_disponible: 'Recibos',
      accion_sugerida: 'Aclarar',
    });
    return clienteId;
  }

  it('CP-137 PDF incompleto: sin diagnóstico 409; con diagnóstico vacío 409 con la lista de campos faltantes (sección, campo y etiqueta) y sin generar el archivo', async () => {
    const sin = await e.cliente();
    const sinDiagnostico = await http(ctx, 'GET', rutaPdf(sin), asesor());
    expect(sinDiagnostico.estado).toBe(409);
    expect((sinDiagnostico.json as { message: string }).message).toBe(
      'Primero crea el diagnóstico especializado (F1).',
    );

    const clienteId = await e.clienteConDiagnostico();
    const r = await http(ctx, 'GET', rutaPdf(clienteId), asesor());
    expect(r.estado).toBe(409);
    expect(r.tipo).toContain('json');
    const cuerpo = r.json as {
      message: string;
      faltantes: { seccion: string; campo: string; etiqueta: string }[];
    };
    expect(cuerpo.message).toBe('El diagnóstico F1 está incompleto: faltan 12 campos.');
    expect(cuerpo.faltantes.map((f) => f.campo).sort()).toEqual(
      [
        'cotizo_antes_julio_1997',
        'tipo_pension_probable',
        'edad_objetivo_pension',
        'tiene_conservacion_derechos',
        'dentro_de_conservacion',
        'conviene_pensionar_ahora',
        'semanas_efectivas_pension',
        'trabaja_cuenta_propia',
        'conclusion_modalidad_10',
        'dado_de_baja_regimen_obligatorio',
        'conclusion_modalidad_40',
        'justificacion_estrategia',
      ].sort(),
    );
    expect(cuerpo.faltantes[0]).toEqual({
      seccion: expect.any(String),
      campo: expect.any(String),
      etiqueta: expect.any(String),
    });

    // Con el diagnóstico completo, pero una situación patrimonial a medias y un escenario sin cálculos, también 409.
    await patch(clienteId, {
      cotizo_antes_julio_1997: true,
      tipo_pension_probable: 'vejez',
      edad_objetivo_pension: 65,
      tiene_conservacion_derechos: 'no',
      dentro_de_conservacion: 'no',
      conviene_pensionar_ahora: 'si',
      semanas_efectivas_pension: 1300,
      trabaja_cuenta_propia: 'no',
      conclusion_modalidad_10: 'no_aplica',
      dado_de_baja_regimen_obligatorio: 'no',
      conclusion_modalidad_40: 'no_aplica',
      justificacion_estrategia: 'x',
    });
    await put(clienteId, 'situacion-patrimonial', { seguros: 'GMM' });
    await http(ctx, 'POST', `${dx(clienteId)}/escenarios`, asesor(), {
      nombre_escenario: 'Base',
      orden: 1,
    });
    const incompleto = (await http(ctx, 'GET', rutaPdf(clienteId), asesor())).json as {
      faltantes: { seccion: string; campo: string }[];
    };
    const campos = incompleto.faltantes.map((f) => `${f.seccion}:${f.campo}`);
    expect(campos).toContain('situacion_patrimonial:saldo_cuenta_individual');
    expect(campos).toContain('escenarios:semanas_proyectadas');
    expect(incompleto.faltantes.some((f) => f.seccion === 'diagnostico')).toBe(false);
  });

  it('CP-138 PDF completo: 200 application/pdf (%PDF-) con el nombre de archivo; trae las 14 secciones, el aviso de alcance, las líneas de firma y los datos capturados', async () => {
    const clienteId = await clienteCompleto();
    const respuesta = await fetch(`${ctx.base}${rutaPdf(clienteId)}`, {
      headers: { Authorization: `Bearer ${asesor()}` },
    });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('application/pdf');
    expect(respuesta.headers.get('content-disposition')).toMatch(
      /^attachment; filename="Diagnostico-especializado-F1-[^"]+\.pdf"$/,
    );
    const pdf = Buffer.from(await respuesta.arrayBuffer());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

    const texto = (await textoDePdf(pdf)).replace(/\s+/g, ' ');
    for (const titulo of [
      '1. Objetivo del cliente',
      '2. Documentos requeridos para el análisis',
      '3. Determinación del régimen pensionario',
      '4. Diagnóstico de semanas cotizadas',
      '5. Recuperación o aclaración de semanas',
      '6. Análisis de conservación de derechos',
      '7. Análisis de Modalidad 10',
      '8. Análisis de Modalidad 40',
      '9. Análisis de Modalidad 40 con pago retroactivo',
      '10. Cálculo de escenarios de pensión',
      '11. Análisis financiero',
      '12. Recomendación final del asesor',
      '13. Plan de acción',
      '14. Aviso de alcance del análisis',
    ]) {
      expect({ titulo, esta: texto.includes(titulo) }).toEqual({ titulo, esta: true });
    }
    for (const dato of [
      'Objetivo propio ficticio',
      'Constancia vigente',
      'Observación de recuperación ficticia',
      'Comentario M10 ficticio',
      'Comentario M40 ficticio',
      'Comentario retroactivo ficticio',
      'Escenario Base Ficticio',
      'Casa ficticia',
      'Justificación ficticia de la estrategia',
      'Siguiente paso ficticio',
      'Acción del plan ficticia',
      'Patrón Periodo Ficticio',
      'Conclusión financiera ficticia',
      'asistentehega@gmail.com',
      'Firma del cliente',
      'Firma del asesor',
      'Constancia de semanas cotizadas IMSS',
      'herramienta de diagnóstico y planeación',
    ]) {
      expect({ dato, esta: texto.includes(dato) }).toEqual({ dato, esta: true });
    }
  });

  it('CP-139 PDF: la fórmula de recuperación y los años para recuperar la inversión se imprimen (meses ÷ 12)', async () => {
    const clienteId = await clienteCompleto();
    const r = await fetch(`${ctx.base}${rutaPdf(clienteId)}`, {
      headers: { Authorization: `Bearer ${asesor()}` },
    });
    const texto = (await textoDePdf(Buffer.from(await r.arrayBuffer()))).replace(/\s+/g, ' ');
    expect(texto).toContain(
      'Inversión total ÷ incremento mensual de pensión = meses aproximados para recuperar inversión.',
    );
    expect(texto).toContain('80.0');
    expect(texto).toContain('6.7');
  });

  it('CP-140 PDF roles: asesor dueño 200/409; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404; nunca 500', async () => {
    const clienteId = await e.clienteConDiagnostico();
    await autorizarEnBd(ctx.ds, clienteId, e.auxiliar.id, e.asesor.id, true);
    const url = rutaPdf(clienteId);
    expect({
      dueno: (await http(ctx, 'GET', url, asesor())).estado,
      supervisor: (await http(ctx, 'GET', url, e.t(e.supervisor))).estado,
      auxiliar: (await http(ctx, 'GET', url, e.t(e.auxiliar))).estado,
      sinToken: (await http(ctx, 'GET', url)).estado,
      ajeno: (await http(ctx, 'GET', url, e.t(e.otroAsesor))).estado,
      inexistente: (await http(ctx, 'GET', rutaPdf(randomUUID()), asesor())).estado,
    }).toEqual({
      dueno: 409,
      supervisor: 403,
      auxiliar: 403,
      sinToken: 401,
      ajeno: 404,
      inexistente: 404,
    });
  });
});
