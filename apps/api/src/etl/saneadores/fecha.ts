import { Saneado } from '../tipos';

// Saneador de fechas (Actividad 5, Tarea 4). Función pura que no depende de la zona horaria del servidor:
// usa solo Date.UTC y los métodos getUTC*. La fecha de salida es siempre UTC a medianoche.
export interface OpcionesFecha {
  tipo: 'nacimiento' | 'ingreso' | 'compromiso';
  // Fecha de referencia (se toma su día en UTC). Se inyecta para que las pruebas no dependan del reloj.
  hoy: Date;
}

const EDAD_MINIMA = 18;
const EDAD_MAXIMA = 100;
// Serie de Excel: 1 es 1900-01-01 y 2958465 es 9999-12-31. El origen 1899-12-30 absorbe el error del
// año 1900 bisiesto que Excel arrastra, correcto para toda fecha desde 1900-03-01.
const SERIE_MAXIMA = 2958465;
const ORIGEN_EXCEL_MS = Date.UTC(1899, 11, 30);
const MS_POR_DIA = 86_400_000;

const MESES: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

interface Partes {
  anio: number;
  mes: number;
  dia: number;
}

// Fecha UTC a medianoche si año, mes y día existen en el calendario; null si no.
function construir({ anio, mes, dia }: Partes): Date | null {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  // Date.UTC trata los años 0 a 99 como 1900 a 1999: se fija el año explícitamente.
  fecha.setUTCFullYear(anio);
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }
  return fecha;
}

function deTexto(texto: string): Date | null {
  const limpio = texto.normalize('NFC').trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(limpio);
  if (m) return construir({ dia: +m[1], mes: +m[2], anio: +m[3] });
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(limpio);
  if (m) return construir({ anio: +m[1], mes: +m[2], dia: +m[3] });
  m = /^(\d{1,2})-([^\W\d_]+)-(\d{4})$/u.exec(limpio);
  if (m) {
    const mes = MESES[m[2].toLowerCase()];
    return mes ? construir({ dia: +m[1], mes, anio: +m[3] }) : null;
  }
  return null;
}

const aMedianoche = (fecha: Date): Date =>
  new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));

// Años cumplidos de `nacimiento` a `hoy`, comparando año, mes y día como números.
function edadEn(nacimiento: Date, hoy: Date): number {
  const anios = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const yaCumplio =
    hoy.getUTCMonth() > nacimiento.getUTCMonth() ||
    (hoy.getUTCMonth() === nacimiento.getUTCMonth() && hoy.getUTCDate() >= nacimiento.getUTCDate());
  return yaCumplio ? anios : anios - 1;
}

export function sanearFecha(raw: unknown, opts: OpcionesFecha): Saneado<Date> {
  const r: Saneado<Date> = { valor: null, ajustes: [], advertencias: [], rechazo: null };
  const etiqueta = {
    nacimiento: 'fecha de nacimiento',
    ingreso: 'fecha de ingreso',
    compromiso: 'fecha compromiso',
  }[opts.tipo];
  const esVacia =
    raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');

  // Una fecha compromiso vacía no es un problema: se queda vacía.
  if (esVacia && opts.tipo === 'compromiso') return r;

  const invalida = (motivo: string): Saneado<Date> => {
    if (opts.tipo === 'compromiso') {
      r.advertencias.push(`fecha_compromiso_invalida: ${motivo}; se carga vacía.`);
    } else {
      r.rechazo = `La ${etiqueta} ${motivo}.`;
    }
    return r;
  };

  if (esVacia) return invalida('viene vacía');

  let fecha: Date | null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return invalida('no es una fecha válida');
    fecha = aMedianoche(raw);
    if (fecha.getTime() !== raw.getTime()) r.ajustes.push('fecha_sin_hora');
  } else if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 1 || raw >= SERIE_MAXIMA + 1) {
      return invalida('no es una fecha válida');
    }
    fecha = new Date(ORIGEN_EXCEL_MS + Math.floor(raw) * MS_POR_DIA);
    r.ajustes.push('fecha_de_serie_excel');
  } else if (typeof raw === 'string') {
    fecha = deTexto(raw);
    if (!fecha)
      return invalida('no tiene un formato de fecha válido (dd/mm/aaaa, aaaa-mm-dd o dd-mmm-aaaa)');
    r.ajustes.push('fecha_de_texto');
  } else {
    return invalida('no es una fecha válida');
  }

  const hoy = aMedianoche(opts.hoy);
  if (opts.tipo === 'ingreso' && fecha.getTime() > hoy.getTime()) {
    r.rechazo = 'La fecha de ingreso es posterior a hoy.';
    r.ajustes = [];
    return r;
  }
  if (opts.tipo === 'nacimiento') {
    const edad = edadEn(fecha, hoy);
    if (edad < EDAD_MINIMA || edad > EDAD_MAXIMA) {
      r.rechazo = `La edad calculada a partir de la fecha de nacimiento queda fuera del rango de ${EDAD_MINIMA} a ${EDAD_MAXIMA} años.`;
      r.ajustes = [];
      return r;
    }
  }
  r.valor = fecha;
  return r;
}
