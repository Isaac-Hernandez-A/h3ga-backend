import { BadRequestException } from '@nestjs/common';

// Listas del F1 que el frontend guarda COMPLETAS con un PUT (reemplazan a las anteriores): las tablas puente
// de catálogo (con "Otro: detalle"), los documentos requeridos y los criterios/preguntas de las secciones 7, 8
// y 9. Cada lista cuelga de un "dueño": el diagnóstico, el análisis de recuperación de semanas o el análisis
// de Modalidad 40 con pago retroactivo. Los nombres de tablas y columnas son los del diccionario.
export type Dueno = 'diagnostico' | 'recuperacion' | 'retroactivo' | 'patrimonial';

type TipoCampo = 'entero' | 'texto' | 'booleano' | 'enum';

export interface CampoLista {
  nombre: string;
  tipo: TipoCampo;
  obligatorio?: boolean;
  valores?: string[]; // para 'enum'
  maximo?: number; // largo máximo de un texto
  minimoEntero?: number;
  maximoEntero?: number;
  porDefecto?: boolean; // valor si no se envía (columna NOT NULL con valor por omisión)
}

export interface DefLista {
  clave: string; // tramo de la ruta, bajo /clientes/:id/diagnostico/
  titulo: string;
  tabla: string;
  dueno: Dueno;
  columnaDueno: string; // columna de la tabla que apunta al dueño
  // 'catalogo': la fila se identifica por (dueño, columnaCatalogo). 'criterio': fila con id UUID propio.
  columnaCatalogo?: string;
  tablaCatalogo?: string;
  campos: CampoLista[]; // campos que acepta cada elemento (además de columnaCatalogo)
  descripcionItem: string;
  // Columnas que se devuelven (por omisión todas). Los hijos ocultan numero_hijos, que no se usa.
  columnas?: string;
}

const detalleOtro: CampoLista = { nombre: 'detalle_otro', tipo: 'texto', maximo: 1000 };

function catalogo(
  clave: string,
  titulo: string,
  tabla: string,
  dueno: Dueno,
  columnaDueno: string,
  columnaCatalogo: string,
  tablaCatalogo: string,
): DefLista {
  return {
    clave,
    titulo,
    tabla,
    dueno,
    columnaDueno,
    columnaCatalogo,
    tablaCatalogo,
    campos: [detalleOtro],
    descripcionItem: `{ ${columnaCatalogo}: entero del catálogo, detalle_otro?: texto|null }`,
  };
}

const DEFINICIONES: DefLista[] = [
  catalogo(
    'objetivos',
    'objetivos del cliente (sección 1)',
    'diagnostico_objetivos',
    'diagnostico',
    'diagnostico_id',
    'objetivo_id',
    'objetivo_diagnostico',
  ),
  catalogo(
    'estrategias-recomendadas',
    'estrategias recomendadas (sección 12)',
    'diagnostico_estrategias_recomendadas',
    'diagnostico',
    'diagnostico_id',
    'estrategia_id',
    'estrategia_recomendada_tipo',
  ),
  catalogo(
    'inconsistencias-generales',
    'revisión de inconsistencias (sección 4)',
    'diagnostico_inconsistencias_generales',
    'diagnostico',
    'diagnostico_id',
    'tipo_id',
    'tipo_inconsistencia_detectada',
  ),
  catalogo(
    'objetivos-modalidad-10',
    'objetivos de Modalidad 10 (sección 7)',
    'diagnostico_objetivos_m10',
    'diagnostico',
    'diagnostico_id',
    'objetivo_id',
    'objetivo_modalidad_10',
  ),
  catalogo(
    'objetivos-modalidad-40',
    'objetivos de Modalidad 40 (sección 8)',
    'diagnostico_objetivos_m40',
    'diagnostico',
    'diagnostico_id',
    'objetivo_id',
    'objetivo_modalidad_40',
  ),
  catalogo(
    'recuperacion-gestiones',
    'tipos de gestión de recuperación (sección 5)',
    'recuperacion_gestiones',
    'recuperacion',
    'analisis_id',
    'tipo_gestion_id',
    'tipo_gestion_recuperacion',
  ),
  catalogo(
    'recuperacion-evidencias',
    'evidencia mínima de recuperación (sección 5)',
    'recuperacion_evidencias',
    'recuperacion',
    'analisis_id',
    'tipo_evidencia_id',
    'tipo_evidencia_recuperacion',
  ),
  {
    clave: 'documentos',
    titulo: 'documentos requeridos (sección 2)',
    tabla: 'diagnostico_documentos',
    dueno: 'diagnostico',
    columnaDueno: 'diagnostico_id',
    columnaCatalogo: 'tipo_documento_id',
    tablaCatalogo: 'tipo_documento_diagnostico',
    campos: [
      { nombre: 'recibido', tipo: 'booleano' },
      { nombre: 'observaciones', tipo: 'texto', maximo: 2000 },
    ],
    descripcionItem:
      '{ tipo_documento_id: entero del catálogo, recibido?: boolean|null, observaciones?: texto|null }',
  },
  {
    clave: 'hijos',
    columnas: 'id, situacion_patrimonial_id, edad, tiene_discapacidad',
    titulo: 'hijos (sección 11)',
    tabla: 'situacion_patrimonial_hijos',
    dueno: 'patrimonial',
    columnaDueno: 'situacion_patrimonial_id',
    campos: [
      { nombre: 'edad', tipo: 'entero', obligatorio: true, minimoEntero: 0, maximoEntero: 120 },
      { nombre: 'tiene_discapacidad', tipo: 'booleano', porDefecto: false },
    ],
    descripcionItem: '{ edad: entero de 0 a 120, tiene_discapacidad?: boolean }',
  },
  {
    clave: 'criterios-modalidad-10',
    titulo: 'criterios de aplicabilidad de Modalidad 10 (sección 7)',
    tabla: 'modalidad10_criterios',
    dueno: 'diagnostico',
    columnaDueno: 'diagnostico_id',
    campos: [
      { nombre: 'criterio', tipo: 'texto', obligatorio: true, maximo: 500 },
      { nombre: 'cumple', tipo: 'booleano' },
      { nombre: 'observaciones', tipo: 'texto', maximo: 2000 },
    ],
    descripcionItem: '{ criterio: texto, cumple?: boolean|null, observaciones?: texto|null }',
  },
  {
    clave: 'criterios-modalidad-40',
    titulo: 'requisitos y restricciones de Modalidad 40 (sección 8)',
    tabla: 'modalidad40_criterios',
    dueno: 'diagnostico',
    columnaDueno: 'diagnostico_id',
    campos: [
      { nombre: 'criterio', tipo: 'texto', obligatorio: true, maximo: 500 },
      {
        nombre: 'cumplimiento',
        tipo: 'enum',
        obligatorio: true,
        valores: ['cumple', 'no_cumple', 'requiere_validar'],
      },
      { nombre: 'observaciones', tipo: 'texto', maximo: 2000 },
    ],
    descripcionItem:
      "{ criterio: texto, cumplimiento: 'cumple'|'no_cumple'|'requiere_validar', observaciones?: texto|null }",
  },
  {
    clave: 'conveniencia-retroactivo',
    titulo: 'evaluación de conveniencia del retroactivo (sección 9)',
    tabla: 'retroactivo_evaluacion_conveniencia',
    dueno: 'retroactivo',
    columnaDueno: 'retroactivo_id',
    campos: [
      { nombre: 'pregunta', tipo: 'texto', obligatorio: true, maximo: 500 },
      { nombre: 'respuesta', tipo: 'booleano' },
    ],
    descripcionItem: '{ pregunta: texto, respuesta?: boolean|null }',
  },
];

export const LISTAS_F1: Record<string, DefLista> = Object.fromEntries(
  DEFINICIONES.map((lista) => [lista.clave, lista]),
);

export const MAX_ELEMENTOS = 100;

// Valida los elementos recibidos contra la definición de la lista. Devuelve los valores listos para guardar.
export function validarElementos(
  def: DefLista,
  items: unknown,
): Record<string, string | number | boolean | null>[] {
  if (!Array.isArray(items)) throw new BadRequestException('items debe ser una lista.');
  if (items.length > MAX_ELEMENTOS) {
    throw new BadRequestException(`items admite como máximo ${MAX_ELEMENTOS} elementos.`);
  }
  const permitidos = new Set([def.columnaCatalogo, ...def.campos.map((c) => c.nombre)]);
  const vistos = new Set<number>();
  return items.map((item, indice) => {
    const donde = `items[${indice}]`;
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new BadRequestException(`${donde} debe ser un objeto.`);
    }
    const objeto = item as Record<string, unknown>;
    for (const clave of Object.keys(objeto)) {
      if (!permitidos.has(clave))
        throw new BadRequestException(`${donde}.${clave} no es un campo permitido.`);
    }
    const valores: Record<string, string | number | boolean | null> = {};
    if (def.columnaCatalogo) {
      const id = objeto[def.columnaCatalogo];
      if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || id > 32767) {
        throw new BadRequestException(
          `${donde}.${def.columnaCatalogo} debe ser un entero positivo.`,
        );
      }
      if (vistos.has(id)) throw new BadRequestException('items tiene elementos repetidos.');
      vistos.add(id);
      valores[def.columnaCatalogo] = id;
    }
    for (const campo of def.campos) {
      const valor = objeto[campo.nombre];
      const ausente = valor === undefined || valor === null;
      if (ausente) {
        if (campo.obligatorio)
          throw new BadRequestException(`${donde}.${campo.nombre} es obligatorio.`);
        valores[campo.nombre] = campo.porDefecto ?? null;
        continue;
      }
      valores[campo.nombre] = validarCampo(donde, campo, valor);
    }
    return valores;
  });
}

function validarCampo(donde: string, campo: CampoLista, valor: unknown): string | boolean | number {
  const nombre = `${donde}.${campo.nombre}`;
  switch (campo.tipo) {
    case 'booleano':
      if (typeof valor !== 'boolean')
        throw new BadRequestException(`${nombre} debe ser verdadero o falso.`);
      return valor;
    case 'entero': {
      const minimo = campo.minimoEntero ?? 0;
      const maximo = campo.maximoEntero ?? 2147483647;
      if (
        typeof valor !== 'number' ||
        !Number.isInteger(valor) ||
        valor < minimo ||
        valor > maximo
      ) {
        throw new BadRequestException(`${nombre} debe ser un entero de ${minimo} a ${maximo}.`);
      }
      return valor;
    }
    case 'enum':
      if (typeof valor !== 'string' || !campo.valores?.includes(valor)) {
        throw new BadRequestException(`${nombre} debe ser uno de: ${campo.valores?.join(', ')}.`);
      }
      return valor;
    case 'texto': {
      if (typeof valor !== 'string') throw new BadRequestException(`${nombre} debe ser texto.`);
      const texto = valor.trim();
      if (campo.obligatorio && texto === '')
        throw new BadRequestException(`${nombre} no puede estar vacío.`);
      if (texto.length > (campo.maximo ?? 2000)) {
        throw new BadRequestException(
          `${nombre} admite como máximo ${campo.maximo ?? 2000} caracteres.`,
        );
      }
      return texto;
    }
    default:
      throw new BadRequestException(`${nombre} no es válido.`);
  }
}
