import { fechaLocal } from '../../common/fechas';
import { DatosF1, FilaCriterio, ItemCatalogo, Seleccion } from './f1-datos';
import { calcularEdad, formatoFecha } from './f0-modelo';
import {
  ALTO_FILA,
  Celda,
  crearDocumento,
  INICIO_CUERPO,
  LIMITE_INFERIOR,
  titulo,
  tabla,
} from './pdf-base';

// Dibuja el formato F1 (Diagnóstico Especializado) con el diseño corporativo del F0: 14 secciones del formato
// oficial "F1. Diagnóstico Especializado Actualizado", aviso de alcance y líneas de firma. Lo que se imprime
// en cada campo sale de `datos` (ver f1-datos.ts); aquí solo se decide cómo se dibuja.
const W = 9972; // ancho útil en twips

const ETIQUETAS: Record<string, Record<string, string>> = {
  tipoPension: {
    cesantia: 'Cesantía',
    vejez: 'Vejez',
    invalidez: 'Invalidez',
    viudez: 'Viudez',
    otro: 'Otro',
  },
  validacion: { si: 'Sí', no: 'No', requiere_validar: 'Requiere validar' },
  conveniencia: { si: 'Sí', no: 'No', depende_escenario: 'Depende del escenario' },
  siNoParcial: { si: 'Sí', no: 'No', parcialmente: 'Parcialmente' },
  modalidad: {
    aplica: 'Aplica',
    no_aplica: 'No aplica',
    aplica_con_restricciones: 'Aplica con restricciones',
    requiere_regularizacion: 'Requiere regularización previa',
    temporal: 'Aplica como estrategia temporal',
    evaluar: 'Requiere validación adicional',
    requiere_contabilidad: 'Requiere contabilidad',
  },
  recuperacion: { si: 'Sí', no: 'No', requiere_mas_evidencia: 'Requiere más evidencia' },
  retroactivo: {
    conviene: 'Conviene',
    no_conviene: 'No conviene',
    conviene_parcialmente: 'Conviene parcialmente',
    requiere_calculo_validacion: 'Requiere cálculo financiero y validación IMSS',
  },
  cumplimiento: { cumple: 'Cumple', no_cumple: 'No cumple', requiere_validar: 'Requiere validar' },
  salud: { bueno: 'Bueno', regular: 'Regular', malo: 'Malo' },
  civil: {
    soltero: 'Soltero',
    casado: 'Casado',
    divorciado: 'Divorciado',
    viudo: 'Viudo',
    concubinato: 'Concubinato',
  },
  plan: { pendiente: 'Pendiente', en_proceso: 'En proceso', hecho: 'Hecho' },
  inconsistencia: {
    pendiente: 'Pendiente',
    en_tramite: 'En trámite',
    recuperado: 'Recuperado',
    no_procedente: 'No procedente',
  },
};

const etiqueta = (grupo: string, valor: string | null | undefined): string =>
  valor ? (ETIQUETAS[grupo][valor] ?? valor) : '—';
const texto = (v: string | null | undefined): string => (v && v.trim() ? v.trim() : '—');
const numero = (v: number | string | null | undefined): string =>
  v === null || v === undefined ? '—' : String(v);
const siNo = (v: boolean | null | undefined): string =>
  v === null || v === undefined ? '—' : v ? 'Sí' : 'No';
// Las columnas DATE llegan como texto AAAA-MM-DD desde las entidades y como Date desde consultas crudas.
const fecha = (v: string | Date | null | undefined): string => {
  if (!v) return '—';
  const iso =
    v instanceof Date
      ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
      : v;
  return formatoFecha(iso) || '—';
};
const dinero = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined) return '—';
  const [entero, decimales] = Number(v).toFixed(2).split('.');
  return `$${entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimales}`;
};

const cabecera = (...columnas: [string, number][]): Celda[] =>
  columnas.map(([textoColumna, ancho]) => ({ ancho, texto: textoColumna, cabecera: true }));
const fila2 = (concepto: string, valor: string, anchoConcepto = 3600): Celda[] => [
  { ancho: anchoConcepto, texto: concepto, negrita: true },
  { ancho: W - anchoConcepto, texto: valor },
];
const parrafo = (rotulo: string, valor: string | null | undefined): Celda[] => [
  { ancho: W, texto: `${rotulo} ${texto(valor)}` },
];
const subtitulo = (rotulo: string): Celda[] => [{ ancho: W, texto: rotulo, cabecera: true }];

// Lista de casillas del catálogo en dos columnas: marcadas las seleccionadas, con el detalle de "Otro".
function casillas(catalogo: ItemCatalogo[], marcadas: Seleccion): Celda[][] {
  const celdas: Celda[] = catalogo.map((item) => {
    const detalle = marcadas.get(item.id);
    return {
      ancho: W / 2,
      texto: detalle ? `${item.nombre}: ${detalle}` : item.nombre,
      casilla: marcadas.has(item.id),
    };
  });
  const filas: Celda[][] = [];
  for (let i = 0; i < celdas.length; i += 2) {
    filas.push([celdas[i], celdas[i + 1] ?? { ancho: W / 2 }]);
  }
  return filas;
}

function tablaCriterios(criterios: FilaCriterio[], binaria: boolean): Celda[][] {
  const encabezado = binaria
    ? cabecera(['Criterio', 4200], ['Sí', 800], ['No', 800], ['Observaciones', 4172])
    : cabecera(
        ['Criterio', 4200],
        ['Cumple', 1000],
        ['No cumple', 1100],
        ['Requiere validar', 1300],
        ['Observaciones', 2372],
      );
  if (criterios.length === 0) return [encabezado, [{ ancho: W, texto: 'Sin registros' }]];
  return [
    encabezado,
    ...criterios.map((c): Celda[] =>
      binaria
        ? [
            { ancho: 4200, texto: c.criterio },
            { ancho: 800, texto: c.cumple === true ? 'X' : '', centrado: true },
            { ancho: 800, texto: c.cumple === false ? 'X' : '', centrado: true },
            { ancho: 4172, texto: texto(c.observaciones) },
          ]
        : [
            { ancho: 4200, texto: c.criterio },
            { ancho: 1000, texto: c.cumplimiento === 'cumple' ? 'X' : '', centrado: true },
            { ancho: 1100, texto: c.cumplimiento === 'no_cumple' ? 'X' : '', centrado: true },
            {
              ancho: 1300,
              texto: c.cumplimiento === 'requiere_validar' ? 'X' : '',
              centrado: true,
            },
            { ancho: 2372, texto: texto(c.observaciones) },
          ],
    ),
  ];
}

const ESCENARIOS_SUGERIDOS: [string, string][] = [
  ['Base', 'Pensionarse sin estrategia adicional'],
  ['Modalidad 10', 'Cotizar como persona trabajadora independiente por _____ meses.'],
  ['Modalidad 40 mínima', 'Cotizar solo para completar semanas o conservar derechos'],
  ['Modalidad 40 media', 'Cotizar con salario intermedio'],
  ['Modalidad 40 topada', 'Cotizar con salario máximo permitido'],
  ['Modalidad 40 retroactiva', 'Pagar periodo anterior permitido / regularizar meses'],
  ['Recuperación de semanas', 'Aclarar semanas y recalcular pensión'],
  ['Mixto', 'Modalidad 10 + Modalidad 40 + recuperación de semanas'],
];

const AVISO_ALCANCE =
  'El presente formato es una herramienta de diagnóstico y planeación. Los cálculos son estimados, con base en la información y documentación proporcionada por el cliente y deben validarse con documentación oficial del IMSS, AFORE y, en su caso, con la resolución emitida por la autoridad competente. La recomendación puede cambiar si existen diferencias en semanas reconocidas, salario base, conservación de derechos, régimen aplicable, edad, topes legales, criterios administrativos o documentación del cliente.';
const AVISO_CONTROL = 'Documento diseñado para control interno y seguimiento de clientes.';
const AVISO_PRIVACIDAD =
  'Protección De Datos Personales (Aviso De Privacidad): el cliente reconoce y acepta que, para la ejecución del presente contrato, entrega a H3GA SEGUROS Y PENSIONES sus datos personales los cuales serán tratados conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP); mismos que serán utilizados exclusivamente para la asesoría técnica en materia de pensiones y jubilaciones. El cliente podrá ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición, así como revocar su consentimiento, enviando una solicitud por escrito al correo electrónico oficial: asistentehega@gmail.com. El texto completo del Aviso de Privacidad Integral, con todos sus detalles y actualizaciones, se encuentra disponible para su consulta permanente en el portal web: https://h3ga.vercel.app/.';

export function dibujarF1(datos: DatosF1): Promise<Buffer> {
  const { cliente, diagnostico: d } = datos;
  const { doc, nuevaPagina, terminado } = crearDocumento({
    titulo: 'Diagnóstico especializado F1',
    subtitulo: 'DIAGNÓSTICO ESPECIALIZADO',
  });
  try {
    let y = INICIO_CUERPO;
    // Un bloque (título y tabla) no se queda huérfano al final de una página.
    const bloque = (rotulo: string, filas: Celda[][]): void => {
      if (y + 30 + 3 * ALTO_FILA > LIMITE_INFERIOR) y = nuevaPagina();
      titulo(doc, y, rotulo);
      y = tabla(doc, y + 30, filas, nuevaPagina) + 22;
    };
    const tablaSuelta = (filas: Celda[][]): void => {
      y = tabla(doc, y, filas, nuevaPagina) + 14;
    };

    const nombre = [cliente.nombre, cliente.apellido_paterno, cliente.apellido_materno]
      .filter(Boolean)
      .join(' ');
    tablaSuelta([
      fila2('Nombre del cliente', nombre, 2600),
      fila2('Asesor', texto(datos.asesor), 2600),
      fila2('Fecha del análisis', fecha(d.fecha_analisis), 2600),
    ]);

    bloque('1. Objetivo del cliente', [
      subtitulo('Marcar lo que aplique:'),
      ...casillas(datos.catalogos.objetivos, datos.objetivos),
      parrafo('Comentarios del cliente:', d.comentarios_cliente),
    ]);

    bloque('2. Documentos requeridos para el análisis', [
      cabecera(['Documento', 4800], ['Recibido', 1200], ['Observaciones', 3972]),
      ...datos.catalogos.documentos.map((doc): Celda[] => {
        const registro = datos.documentos.get(doc.id);
        return [
          { ancho: 4800, texto: doc.nombre },
          { ancho: 1200, texto: siNo(registro?.recibido), centrado: true },
          { ancho: 3972, texto: texto(registro?.observaciones) },
        ];
      }),
    ]);

    const hoy = fechaLocal(new Date());
    bloque('3. Determinación del régimen pensionario', [
      cabecera(['Concepto', 3600], ['Resultado', 6372]),
      fila2('Fecha de primera cotización al IMSS', fecha(d.fecha_primera_cotizacion)),
      fila2('¿Cotizó antes del 1 de julio de 1997?', siNo(d.cotizo_antes_julio_1997)),
      fila2('Régimen probable', texto(datos.ley)),
      fila2(
        'Edad actual',
        cliente.fecha_nacimiento ? `${calcularEdad(cliente.fecha_nacimiento, hoy)} años` : '—',
      ),
      fila2('Edad objetivo de pensión', numero(d.edad_objetivo_pension)),
      fila2('Tipo de pensión probable', etiqueta('tipoPension', d.tipo_pension_probable)),
      fila2(
        '¿Tiene conservación de derechos?',
        etiqueta('validacion', d.tiene_conservacion_derechos),
      ),
      fila2(
        'Fecha estimada de vencimiento de conservación',
        fecha(d.fecha_vencimiento_conservacion),
      ),
      fila2('¿Requiere reactivación?', siNo(d.requiere_reactivacion)),
      parrafo('Observaciones del régimen:', d.observaciones_regimen),
    ]);

    bloque('4. Diagnóstico de semanas cotizadas', [
      cabecera(['Concepto', 3600], ['Resultado', 6372]),
      fila2('Semanas reconocidas por el IMSS', numero(d.semanas_reconocidas_al_baja)),
      fila2('Semanas descontadas', numero(d.semanas_descontadas)),
      fila2('Semanas reintegradas', numero(d.semanas_reintegradas)),
      fila2('Semanas efectivas para pensión', numero(d.semanas_efectivas_pension)),
      fila2('Semanas requeridas para pensión', numero(d.semanas_requeridas_pension)),
      fila2('Último patrón registrado', texto(datos.ultimoPatron)),
      fila2('Fecha de última baja IMSS', fecha(d.fecha_ultima_baja)),
      fila2('Último salario base de cotización registrado', dinero(d.ultimo_salario_cotizado)),
      subtitulo('Revisión de inconsistencias'),
      ...casillas(datos.catalogos.inconsistencias, datos.inconsistencias),
      subtitulo('Detalle de periodos a revisar'),
      [
        { ancho: 1500, texto: 'Periodo', negrita: true },
        { ancho: 2000, texto: 'Patrón', negrita: true },
        { ancho: 1100, texto: 'Esperadas', negrita: true },
        { ancho: 1100, texto: 'Reconocidas', negrita: true },
        { ancho: 2000, texto: 'Evidencia disponible', negrita: true },
        { ancho: 2272, texto: 'Acción sugerida', negrita: true },
      ],
      ...(datos.periodos.length === 0
        ? [[{ ancho: W, texto: 'Sin registros' }]]
        : datos.periodos.map((p): Celda[] => [
            { ancho: 1500, texto: p.periodo_reclamado },
            { ancho: 2000, texto: p.nombre_patron },
            { ancho: 1100, texto: String(p.semanas_esperadas) },
            { ancho: 1100, texto: String(p.semanas_reconocidas) },
            { ancho: 2000, texto: p.evidencia_disponible },
            {
              ancho: 2272,
              texto: `${p.accion_sugerida} (${etiqueta('inconsistencia', p.estatus)})`,
            },
          ])),
    ]);

    bloque('5. Recuperación o aclaración de semanas', [
      fila2(
        '¿Aplica recuperación/aclaración de semanas?',
        etiqueta('recuperacion', datos.recuperacion?.aplica),
        4200,
      ),
      subtitulo('Tipo de gestión sugerida:'),
      ...casillas(datos.catalogos.gestiones, datos.gestiones),
      subtitulo('Evidencia mínima sugerida:'),
      ...casillas(datos.catalogos.evidencias, datos.evidencias),
      parrafo('Observaciones:', datos.recuperacion?.observaciones),
    ]);

    bloque('6. Análisis de conservación de derechos', [
      cabecera(['Concepto', 3600], ['Resultado', 6372]),
      fila2('Fecha de baja más reciente', fecha(d.fecha_ultima_baja)),
      fila2('Semanas reconocidas al momento de baja', numero(d.semanas_reconocidas_al_baja)),
      fila2(
        'Tiempo estimado de conservación',
        d.tiempo_estimado_conservacion_meses === null
          ? '—'
          : `${d.tiempo_estimado_conservacion_meses} meses (${Math.floor(d.tiempo_estimado_conservacion_meses / 12)} años ${d.tiempo_estimado_conservacion_meses % 12} meses)`,
      ),
      fila2('Fecha estimada de vencimiento', fecha(d.fecha_vencimiento_conservacion)),
      fila2('¿Está dentro de conservación?', etiqueta('validacion', d.dentro_de_conservacion)),
      fila2('¿Conviene pensionar ahora?', etiqueta('conveniencia', d.conviene_pensionar_ahora)),
      fila2('¿Requiere reactivación mediante cotización?', siNo(d.requiere_reactivacion)),
      parrafo('Comentarios:', d.comentarios_conservacion),
    ]);

    bloque('7. Análisis de Modalidad 10 / persona trabajadora independiente', [
      fila2(
        '¿El cliente trabaja actualmente por cuenta propia?',
        etiqueta('siNoParcial', d.trabaja_cuenta_propia),
        4200,
      ),
      fila2('Actividad económica', texto(d.actividad_economica), 4200),
      fila2('Ingreso mensual aproximado', dinero(d.ingreso_mensual_aproximado), 4200),
      subtitulo('Objetivo al evaluar Modalidad 10:'),
      ...casillas(datos.catalogos.m10, datos.objetivosM10),
      subtitulo('Evaluación de aplicabilidad'),
      ...tablaCriterios(datos.criteriosM10, true),
      fila2(
        'Conclusión preliminar Modalidad 10',
        etiqueta('modalidad', d.conclusion_modalidad_10),
        4200,
      ),
      parrafo('Comentarios:', d.comentarios_modalidad_10),
    ]);

    bloque('8. Análisis de Modalidad 40', [
      fila2(
        '¿El cliente fue dado de baja del régimen obligatorio?',
        etiqueta('validacion', d.dado_de_baja_regimen_obligatorio),
        4600,
      ),
      fila2('Fecha de baja', fecha(d.fecha_ultima_baja), 4600),
      fila2('Último salario base de cotización', dinero(d.ultimo_salario_cotizado), 4600),
      fila2('Salario propuesto para Modalidad 40 (diario)', dinero(d.salario_propuesto_m40), 4600),
      fila2('Meses propuestos de cotización', numero(d.meses_propuestos_m40), 4600),
      subtitulo('Objetivo de Modalidad 40:'),
      ...casillas(datos.catalogos.m40, datos.objetivosM40),
      subtitulo('Evaluación de requisitos y restricciones'),
      ...tablaCriterios(datos.criteriosM40, false),
      fila2(
        'Conclusión preliminar Modalidad 40',
        etiqueta('modalidad', d.conclusion_modalidad_40),
        4600,
      ),
      parrafo('Comentarios:', d.comentarios_modalidad_40),
    ]);

    const r = datos.retroactivo;
    bloque('9. Análisis de Modalidad 40 con pago retroactivo', [
      [
        {
          ancho: W,
          texto:
            'Usar esta sección cuando se evalúe iniciar o regularizar Modalidad 40 desde una fecha anterior permitida, pagar meses omitidos, o reingresar después de baja por falta de pago. Validar siempre contra la Subdelegación y normativa vigente.',
        },
      ],
      cabecera(['Concepto', 4600], ['Dato', 5372]),
      fila2('Fecha de baja IMSS', fecha(d.fecha_ultima_baja), 4600),
      fila2(
        'Fecha propuesta de inicio de Modalidad 40',
        fecha(r?.fecha_propuesta_inicio_m40),
        4600,
      ),
      fila2('Fecha de solicitud', fecha(r?.fecha_solicitud), 4600),
      fila2('Meses retroactivos estimados', numero(r?.meses_retroactivos_estimados), 4600),
      fila2('Salario diario propuesto', dinero(r?.salario_diario_propuesto), 4600),
      fila2('Cuotas estimadas', dinero(r?.cuotas_estimadas), 4600),
      fila2(
        'Recargos / actualizaciones estimadas',
        dinero(r?.recargos_actualizaciones_estimadas),
        4600,
      ),
      fila2('Total estimado a pagar', dinero(r?.total_estimado_pagar), 4600),
      fila2('¿Existe baja por mora previa?', siNo(r?.baja_por_mora_previa), 4600),
      fila2(
        '¿Está dentro de plazo para reingreso, si aplica?',
        etiqueta('validacion', r?.dentro_de_plazo_reingreso),
        4600,
      ),
      subtitulo('Evaluación de conveniencia'),
      cabecera(['Pregunta', 8000], ['Respuesta', 1972]),
      ...(datos.conveniencia.length === 0
        ? [[{ ancho: W, texto: 'Sin registros' }]]
        : datos.conveniencia.map((c): Celda[] => [
            { ancho: 8000, texto: c.pregunta },
            { ancho: 1972, texto: siNo(c.respuesta), centrado: true },
          ])),
      fila2(
        'Conclusión preliminar sobre retroactivo',
        etiqueta('retroactivo', r?.conclusion_retroactivo),
        4600,
      ),
      parrafo('Comentarios:', r?.comentarios),
    ]);

    bloque('10. Cálculo de escenarios de pensión', [
      cabecera(['Escenario sugerido', 3000], ['Descripción', 6972]),
      ...ESCENARIOS_SUGERIDOS.map(([nombreEscenario, descripcion]): Celda[] => [
        { ancho: 3000, texto: nombreEscenario, negrita: true },
        {
          ancho: 6972,
          texto:
            nombreEscenario === 'Modalidad 10' &&
            datos.escenarios.some((e) => e.meses_modalidad_10 !== null)
              ? `Cotizar como persona trabajadora independiente por ${datos.escenarios.find((e) => e.meses_modalidad_10 !== null)?.meses_modalidad_10} meses.`
              : descripcion,
        },
      ]),
      subtitulo('Escenarios capturados (hasta 3)'),
      ...(datos.escenarios.length === 0
        ? [[{ ancho: W, texto: 'Sin registros' }]]
        : datos.escenarios.map((e): Celda[] => [
            { ancho: 1200, texto: `Escenario ${e.orden}`, negrita: true },
            { ancho: 8772, texto: e.nombre_escenario },
          ])),
    ]);

    const p = datos.patrimonial;
    const esc = [1, 2, 3].map((orden) => datos.escenarios.find((e) => e.orden === orden));
    const columna = (campo: (e: NonNullable<(typeof esc)[number]>) => string): Celda[] =>
      esc.map((e): Celda => ({ ancho: 2200, texto: e ? campo(e) : '—', centrado: true }));
    const filaEscenario = (
      concepto: string,
      campo: (e: NonNullable<(typeof esc)[number]>) => string,
    ): Celda[] => [{ ancho: 3372, texto: concepto, negrita: true }, ...columna(campo)];
    const edades = datos.hijos.map((h) => h.edad).join(', ');
    const conDiscapacidad = datos.hijos.filter((h) => h.tiene_discapacidad).length;
    bloque('11. Análisis financiero / Retorno de inversión', [
      cabecera(['Situación patrimonial y de ahorro para el retiro', 5200], ['Descripción', 4772]),
      fila2('Saldo actual de la cuenta individual', dinero(p?.saldo_cuenta_individual), 5200),
      fila2('Aportaciones voluntarias existentes', dinero(p?.aportaciones_voluntarias), 5200),
      fila2(
        'Ahorros e inversiones adicionales destinados al retiro',
        dinero(p?.ahorros_inversiones_adicionales),
        5200,
      ),
      fila2('Bienes patrimoniales', texto(p?.bienes_patrimoniales), 5200),
      fila2('Crédito o deudas vigentes', texto(p?.creditos_deudas_vigentes), 5200),
      fila2('Salario o ingreso mensual', dinero(p?.ingreso_mensual), 5200),
      fila2(
        'Rentas, inversiones u otras fuentes de ingreso',
        texto(p?.otras_fuentes_ingreso),
        5200,
      ),
      fila2('Ingresos del cónyuge o pareja', dinero(p?.ingreso_conyuge), 5200),
      fila2('Seguros', texto(p?.seguros), 5200),
      fila2('Estado de salud', etiqueta('salud', p?.estado_salud), 5200),
      fila2('Padecimientos detectados', texto(p?.padecimientos), 5200),
      fila2('Estado civil', etiqueta('civil', p?.estado_civil), 5200),
      fila2('Edad del cónyuge', numero(p?.edad_conyuge), 5200),
      fila2('Actividad económica del cónyuge', texto(p?.actividad_economica_conyuge), 5200),
      fila2('Número de hijos', String(datos.hijos.length), 5200),
      fila2('Edad de cada hijo', edades || '—', 5200),
      fila2('Hijos con discapacidad', String(conDiscapacidad), 5200),
      subtitulo('Comparativo de escenarios'),
      [
        { ancho: 3372, texto: 'Concepto', cabecera: true },
        ...esc.map((e, i): Celda => ({
          ancho: 2200,
          texto: e ? `${i + 1}. ${e.nombre_escenario}` : `Escenario ${i + 1}`,
          cabecera: true,
          centrado: true,
        })),
      ],
      filaEscenario('Inversión total estimada', (e) => dinero(e.inversion_total_estimada)),
      filaEscenario('Pensión mensual base', (e) =>
        e.pension_mensual_estimada !== null && e.incremento_mensual !== null
          ? dinero(e.pension_mensual_estimada - e.incremento_mensual)
          : '—',
      ),
      filaEscenario('Pensión mensual proyectada', (e) => dinero(e.pension_mensual_estimada)),
      filaEscenario('Incremento mensual de pensión', (e) => dinero(e.incremento_mensual)),
      filaEscenario('Meses para recuperar inversión', (e) =>
        e.meses_recuperacion_inversion === null ? '—' : e.meses_recuperacion_inversion.toFixed(1),
      ),
      filaEscenario('Años para recuperar inversión', (e) =>
        e.meses_recuperacion_inversion === null
          ? '—'
          : (e.meses_recuperacion_inversion / 12).toFixed(1),
      ),
      filaEscenario('Beneficio acumulado a 5 años', (e) => dinero(e.beneficio_a_5_anios)),
      filaEscenario('Beneficio acumulado a 10 años', (e) => dinero(e.beneficio_a_10_anios)),
      filaEscenario('Beneficio acumulado a 15 años', (e) => dinero(e.beneficio_a_15_anios)),
      [{ ancho: W, texto: 'Fórmula de recuperación simple:' }],
      [
        {
          ancho: W,
          texto:
            'Inversión total ÷ incremento mensual de pensión = meses aproximados para recuperar inversión.',
        },
      ],
      parrafo('Conclusión financiera:', d.conclusion_financiera),
    ]);

    bloque('12. Recomendación final del asesor', [
      subtitulo('Estrategia recomendada:'),
      ...casillas(datos.catalogos.estrategias, datos.estrategias),
      parrafo('Justificación:', d.justificacion_estrategia),
      parrafo('Siguiente paso sugerido:', d.siguiente_paso_sugerido),
    ]);

    bloque('13. Plan de acción', [
      cabecera(
        ['Acción', 3800],
        ['Fecha objetivo', 1500],
        ['Estatus', 1400],
        ['Observaciones', 3272],
      ),
      ...(datos.plan.length === 0
        ? [[{ ancho: W, texto: 'Sin registros' }]]
        : datos.plan.map((a): Celda[] => [
            { ancho: 3800, texto: a.accion },
            { ancho: 1500, texto: fecha(a.fecha_objetivo) },
            { ancho: 1400, texto: etiqueta('plan', a.estatus) },
            { ancho: 3272, texto: texto(a.observaciones) },
          ])),
    ]);

    bloque('14. Aviso de alcance del análisis', [
      [{ ancho: W, texto: AVISO_ALCANCE }],
      [{ ancho: W, texto: AVISO_CONTROL }],
      [{ ancho: W, texto: AVISO_PRIVACIDAD }],
      [
        { ancho: W / 2, texto: 'Firma del cliente:\n\n\n\n' },
        { ancho: W / 2, texto: 'Firma del asesor:\n\n\n\n' },
      ],
    ]);

    doc.end();
  } catch (error) {
    doc.end();
    return Promise.reject(error as Error);
  }
  return terminado;
}
