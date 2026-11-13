import { randomUUID } from 'node:crypto';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { autorizarEnBd, limpiarDatosClientes } from '../common/testing/datos-clientes';
import { EntornoF1, entornoF1, http } from '../common/testing/f1';

// F1: listas que se reemplazan completas con PUT (tablas puente y criterios), CP-119 a CP-124.
jest.setTimeout(120_000);

const MENSAJE_SIN_DIAGNOSTICO = 'Primero crea el diagnóstico especializado (F1).';
const MENSAJE_SIN_RECUPERACION = 'Primero registra el análisis de recuperación de semanas.';
const MENSAJE_SIN_RETROACTIVO =
  'Primero registra el análisis de Modalidad 40 con pago retroactivo.';

interface ListaCatalogo {
  ruta: string; // bajo /clientes/:id/diagnostico/
  tabla: string;
  columna: string; // columna FK del catálogo en la tabla puente
  catalogo: string; // tabla del catálogo
  dueno: 'diagnostico' | 'recuperacion';
  conDetalleOtro: boolean;
}

const LISTAS: ListaCatalogo[] = [
  {
    ruta: 'objetivos',
    tabla: 'diagnostico_objetivos',
    columna: 'objetivo_id',
    catalogo: 'objetivo_diagnostico',
    dueno: 'diagnostico',
    conDetalleOtro: true,
  },
  {
    ruta: 'estrategias-recomendadas',
    tabla: 'diagnostico_estrategias_recomendadas',
    columna: 'estrategia_id',
    catalogo: 'estrategia_recomendada_tipo',
    dueno: 'diagnostico',
    conDetalleOtro: true,
  },
  {
    ruta: 'inconsistencias-generales',
    tabla: 'diagnostico_inconsistencias_generales',
    columna: 'tipo_id',
    catalogo: 'tipo_inconsistencia_detectada',
    dueno: 'diagnostico',
    conDetalleOtro: true,
  },
  {
    ruta: 'objetivos-modalidad-10',
    tabla: 'diagnostico_objetivos_m10',
    columna: 'objetivo_id',
    catalogo: 'objetivo_modalidad_10',
    dueno: 'diagnostico',
    conDetalleOtro: true,
  },
  {
    ruta: 'objetivos-modalidad-40',
    tabla: 'diagnostico_objetivos_m40',
    columna: 'objetivo_id',
    catalogo: 'objetivo_modalidad_40',
    dueno: 'diagnostico',
    conDetalleOtro: true,
  },
  {
    ruta: 'recuperacion-gestiones',
    tabla: 'recuperacion_gestiones',
    columna: 'tipo_gestion_id',
    catalogo: 'tipo_gestion_recuperacion',
    dueno: 'recuperacion',
    conDetalleOtro: true,
  },
  {
    ruta: 'recuperacion-evidencias',
    tabla: 'recuperacion_evidencias',
    columna: 'tipo_evidencia_id',
    catalogo: 'tipo_evidencia_recuperacion',
    dueno: 'recuperacion',
    conDetalleOtro: true,
  },
  {
    ruta: 'documentos',
    tabla: 'diagnostico_documentos',
    columna: 'tipo_documento_id',
    catalogo: 'tipo_documento_diagnostico',
    dueno: 'diagnostico',
    conDetalleOtro: false,
  },
];

// Criterios y preguntas: texto libre (el frontend manda el texto fijo del formato) y su respuesta.
const CRITERIOS = [
  {
    ruta: 'criterios-modalidad-10',
    tabla: 'modalidad10_criterios',
    dueno: 'diagnostico',
    validos: [
      {
        criterio: 'Tiene actividad independiente real',
        cumple: true,
        observaciones: 'Con facturas',
      },
      { criterio: 'Tiene CURP, NSS y correo', cumple: false },
      { criterio: 'Puede comprobar ingreso / actividad' },
    ],
    invalidos: [
      ['criterio vacío', { criterio: '' }],
      ['sin criterio', { cumple: true }],
      ['cumple como texto', { criterio: 'x', cumple: 'si' }],
      ['campo desconocido', { criterio: 'x', otro: 1 }],
    ],
  },
  {
    ruta: 'criterios-modalidad-40',
    tabla: 'modalidad40_criterios',
    dueno: 'diagnostico',
    validos: [
      {
        criterio: 'Cuenta con baja del régimen obligatorio',
        cumplimiento: 'cumple',
        observaciones: 'ok',
      },
      { criterio: 'Puede cubrir pagos mensuales adelantados', cumplimiento: 'requiere_validar' },
    ],
    invalidos: [
      ['sin cumplimiento', { criterio: 'x' }],
      ['cumplimiento fuera del enum', { criterio: 'x', cumplimiento: 'quizá' }],
      ['criterio vacío', { criterio: '', cumplimiento: 'cumple' }],
      ['campo desconocido', { criterio: 'x', cumplimiento: 'cumple', otro: 1 }],
    ],
  },
  {
    ruta: 'conveniencia-retroactivo',
    tabla: 'retroactivo_evaluacion_conveniencia',
    dueno: 'retroactivo',
    validos: [
      { pregunta: '¿El retroactivo mejora salario promedio?', respuesta: true },
      { pregunta: '¿Reduce tiempo para pensionarse?', respuesta: false },
      { pregunta: '¿Hay riesgo de rechazo o ajuste por IMSS?' },
    ],
    invalidos: [
      ['sin pregunta', { respuesta: true }],
      ['respuesta como texto', { pregunta: 'x', respuesta: 'si' }],
      ['pregunta vacía', { pregunta: '' }],
      ['campo desconocido', { pregunta: 'x', otro: 1 }],
    ],
  },
] as const;

describeConBd('F1: listas que se reemplazan completas (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let e: EntornoF1;
  const base = (clienteId: string) => `/clientes/${clienteId}/diagnostico`;

  // Prepara el dueño de la lista: el diagnóstico y, según la lista, el análisis de recuperación o el retroactivo.
  async function clienteListo(
    dueno: 'diagnostico' | 'recuperacion' | 'retroactivo',
  ): Promise<string> {
    const clienteId = await e.clienteConDiagnostico();
    if (dueno === 'recuperacion') {
      const r = await http(ctx, 'PUT', `${base(clienteId)}/recuperacion-semanas`, e.t(e.asesor), {
        aplica: 'si',
      });
      expect(r.estado).toBe(200);
    }
    if (dueno === 'retroactivo') {
      const r = await http(
        ctx,
        'PUT',
        `${base(clienteId)}/modalidad-40-retroactivo`,
        e.t(e.asesor),
        {},
      );
      expect(r.estado).toBe(200);
    }
    return clienteId;
  }
  const idsCatalogo = async (tabla: string) =>
    (await ctx.ds.query<{ id: number }[]>(`SELECT id FROM ${tabla} ORDER BY id`)).map((f) => f.id);
  const put = (clienteId: string, lista: string, items: unknown, token = e.t(e.asesor)) =>
    http(ctx, 'PUT', `${base(clienteId)}/${lista}`, token, { items });
  const get = (clienteId: string, lista: string, token = e.t(e.asesor)) =>
    http(ctx, 'GET', `${base(clienteId)}/${lista}`, token);

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    e = await entornoF1(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it.each(LISTAS)(
    'CP-119 $ruta: PUT reemplaza la lista completa y GET devuelve lo guardado',
    async (lista) => {
      const clienteId = await clienteListo(lista.dueno);
      const ids = await idsCatalogo(lista.catalogo);
      expect(ids.length).toBeGreaterThan(2);

      expect((await get(clienteId, lista.ruta)).json).toEqual([]);
      const primero = lista.conDetalleOtro
        ? [
            { [lista.columna]: ids[0], detalle_otro: 'Detalle del otro' },
            { [lista.columna]: ids[2] },
          ]
        : [
            { [lista.columna]: ids[0], recibido: true, observaciones: 'Original' },
            { [lista.columna]: ids[2], recibido: false },
          ];
      const guardado = await put(clienteId, lista.ruta, primero);
      expect(guardado.estado).toBe(200);
      const filas = guardado.json as Record<string, unknown>[];
      expect(filas.map((f) => f[lista.columna])).toEqual([ids[0], ids[2]]);
      expect(filas[0]).toMatchObject(primero[0]);
      expect((await get(clienteId, lista.ruta)).json).toEqual(filas);

      // Reemplaza: lo que no viene se borra.
      const segundo = await put(clienteId, lista.ruta, [{ [lista.columna]: ids[1] }]);
      expect((segundo.json as Record<string, unknown>[]).map((f) => f[lista.columna])).toEqual([
        ids[1],
      ]);

      // Lista vacía: borra todo.
      const vacia = await put(clienteId, lista.ruta, []);
      expect(vacia.estado).toBe(200);
      expect(vacia.json).toEqual([]);
      expect((await get(clienteId, lista.ruta)).json).toEqual([]);
    },
  );

  it.each(LISTAS)(
    'CP-120 $ruta: valida los elementos (400) y no cambia lo guardado',
    async (lista) => {
      const clienteId = await clienteListo(lista.dueno);
      const ids = await idsCatalogo(lista.catalogo);
      const bueno = [{ [lista.columna]: ids[0] }];
      expect((await put(clienteId, lista.ruta, bueno)).estado).toBe(200);
      const col = lista.columna;
      const invalidos: [string, unknown][] = [
        ['items ausente', undefined],
        ['items no es lista', { [col]: ids[0] }],
        ['elemento que no es objeto', ['texto']],
        ['sin la columna del catálogo', [{ detalle_otro: 'x' }]],
        ['id que no existe en el catálogo', [{ [col]: 999999 }]],
        ['id negativo', [{ [col]: -1 }]],
        ['id decimal', [{ [col]: 1.5 }]],
        ['id como texto', [{ [col]: '1' }]],
        ['elementos repetidos', [{ [col]: ids[0] }, { [col]: ids[0] }]],
        ['campo desconocido', [{ [col]: ids[0], otro: 1 }]],
        ['detalle_otro numérico', [{ [col]: ids[0], detalle_otro: 5 }]],
        ['detalle con NUL', [{ [col]: ids[0], detalle_otro: 'a\u0000b' }]],
        ['más de 100 elementos', Array.from({ length: 101 }, (_, i) => ({ [col]: i + 1 }))],
      ];
      for (const [caso, items] of invalidos) {
        const cuerpo = items === undefined ? {} : { items };
        const r = await http(ctx, 'PUT', `${base(clienteId)}/${lista.ruta}`, e.t(e.asesor), cuerpo);
        expect({ caso, estado: r.estado }).toEqual({ caso, estado: 400 });
      }
      const intacto = (await get(clienteId, lista.ruta)).json as Record<string, unknown>[];
      expect(intacto.map((f) => f[col])).toEqual([ids[0]]);
    },
  );

  it.each(CRITERIOS)(
    'CP-121 $ruta: PUT reemplaza la lista (con id generado) y GET la devuelve en el mismo orden; los valores inválidos dan 400',
    async (criterios) => {
      const clienteId = await clienteListo(criterios.dueno);
      expect((await get(clienteId, criterios.ruta)).json).toEqual([]);
      const r = await put(clienteId, criterios.ruta, criterios.validos);
      expect(r.estado).toBe(200);
      const filas = r.json as Record<string, unknown>[];
      expect(filas).toHaveLength(criterios.validos.length);
      filas.forEach((fila, i) => {
        expect(fila).toMatchObject(criterios.validos[i]);
        expect(fila.id).toMatch(/^[0-9a-f-]{36}$/);
      });
      expect((await get(clienteId, criterios.ruta)).json).toEqual(filas);

      // Reemplazar genera filas nuevas y no deja las anteriores.
      const reemplazo = await put(clienteId, criterios.ruta, [criterios.validos[0]]);
      expect((reemplazo.json as unknown[]).length).toBe(1);
      expect(
        await ctx.ds.query(`SELECT 1 FROM ${criterios.tabla} WHERE id = $1`, [filas[1].id]),
      ).toHaveLength(0);

      for (const [caso, item] of criterios.invalidos) {
        const inv = await put(clienteId, criterios.ruta, [item]);
        expect({ caso, estado: inv.estado }).toEqual({ caso, estado: 400 });
      }
      expect((await put(clienteId, criterios.ruta, [])).json).toEqual([]);
    },
  );

  it('CP-122 sin el dueño de la lista: GET responde [] y PUT 409 con el mensaje que dice qué falta', async () => {
    const sinDiagnostico = await e.cliente();
    const conDiagnostico = await e.clienteConDiagnostico();
    const ids = await idsCatalogo('objetivo_diagnostico');
    for (const lista of LISTAS) {
      const dueno = lista.dueno === 'diagnostico' ? sinDiagnostico : conDiagnostico;
      const item = [{ [lista.columna]: ids[0] }];
      expect((await get(dueno, lista.ruta)).json).toEqual([]);
      const r = await put(dueno, lista.ruta, item);
      expect({ ruta: lista.ruta, estado: r.estado }).toEqual({ ruta: lista.ruta, estado: 409 });
      expect((r.json as { message: string }).message).toBe(
        lista.dueno === 'diagnostico' ? MENSAJE_SIN_DIAGNOSTICO : MENSAJE_SIN_RECUPERACION,
      );
    }
    for (const criterios of CRITERIOS) {
      const dueno = criterios.dueno === 'diagnostico' ? sinDiagnostico : conDiagnostico;
      const r = await put(dueno, criterios.ruta, [criterios.validos[0]]);
      expect({ ruta: criterios.ruta, estado: r.estado }).toEqual({
        ruta: criterios.ruta,
        estado: 409,
      });
      expect((r.json as { message: string }).message).toBe(
        criterios.dueno === 'diagnostico' ? MENSAJE_SIN_DIAGNOSTICO : MENSAJE_SIN_RETROACTIVO,
      );
    }
  });

  it('CP-123 roles en todas las listas: asesor dueño 200; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404', async () => {
    const clienteId = await clienteListo('recuperacion');
    await http(ctx, 'PUT', `${base(clienteId)}/modalidad-40-retroactivo`, e.t(e.asesor), {});
    await autorizarEnBd(ctx.ds, clienteId, e.auxiliar.id, e.asesor.id, true);
    const rutas = [...LISTAS.map((l) => l.ruta), ...CRITERIOS.map((c) => c.ruta)];
    const fallos: unknown[] = [];
    for (const lista of rutas) {
      for (const metodo of ['GET', 'PUT']) {
        const cuerpo = metodo === 'PUT' ? { items: [] } : undefined;
        const url = `${base(clienteId)}/${lista}`;
        const estados = {
          lista,
          metodo,
          dueno: (await http(ctx, metodo, url, e.t(e.asesor), cuerpo)).estado,
          supervisor: (await http(ctx, metodo, url, e.t(e.supervisor), cuerpo)).estado,
          auxiliar: (await http(ctx, metodo, url, e.t(e.auxiliar), cuerpo)).estado,
          sinToken: (await http(ctx, metodo, url, undefined, cuerpo)).estado,
          ajeno: (await http(ctx, metodo, url, e.t(e.otroAsesor), cuerpo)).estado,
          inexistente: (
            await http(ctx, metodo, `${base(randomUUID())}/${lista}`, e.t(e.asesor), cuerpo)
          ).estado,
        };
        if (
          JSON.stringify(Object.values(estados).slice(2)) !==
          JSON.stringify([200, 403, 403, 401, 404, 404])
        ) {
          fallos.push(estados);
        }
      }
    }
    expect(fallos).toEqual([]);
  });

  it('CP-124 ninguna entrada responde 500 en las listas: cuerpos que no son objeto, JSON roto y valores extremos', async () => {
    const clienteId = await clienteListo('recuperacion');
    await http(ctx, 'PUT', `${base(clienteId)}/modalidad-40-retroactivo`, e.t(e.asesor), {});
    const resultados: { caso: string; estado: number }[] = [];
    for (const lista of [...LISTAS.map((l) => l.ruta), ...CRITERIOS.map((c) => c.ruta)]) {
      for (const crudo of [
        '',
        '{',
        'null',
        '[]',
        '"texto"',
        '123',
        '{"items":null}',
        '{"items":[null]}',
      ]) {
        const r = await http(
          ctx,
          'PUT',
          `${base(clienteId)}/${lista}`,
          e.t(e.asesor),
          undefined,
          crudo,
        );
        resultados.push({ caso: `${lista} ${crudo}`, estado: r.estado });
      }
      const grande = await http(ctx, 'PUT', `${base(clienteId)}/${lista}`, e.t(e.asesor), {
        items: [{ criterio: 'x'.repeat(200_000), pregunta: 'y'.repeat(200_000) }],
      });
      resultados.push({ caso: `${lista} enorme`, estado: grande.estado });
    }
    for (const { caso, estado } of resultados) {
      expect({ caso, quinientos: estado >= 500 }).toEqual({ caso, quinientos: false });
    }
  });
});
