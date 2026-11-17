import { Saneado } from '../tipos';
import { limpiarTexto } from './texto';

// Saneadores de catálogos y semanas (Actividad 5, Tarea 6). Los nombres son los del sistema
// (db/migrations/202610301007_semillas_catalogos.sql; estado civil es el enum estado_civil). Se comparan
// sin acentos, mayúsculas ni espacios de más.
export type NombreCatalogo = 'regimen' | 'ley' | 'afore' | 'estadoCivil';

const NO_DETERMINADO = 'No determinado';

// Clave de comparación: sin acentos, en minúsculas, sin espacios de más ni alrededor de la barra.
const clave = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();

// Para cada catálogo: clave de comparación a valor del sistema (nombres exactos y alias conocidos).
const CATALOGOS: Record<NombreCatalogo, Record<string, string>> = {
  regimen: Object.fromEntries(
    ['IMSS', 'ISSSTE', 'Mixto IMSS-ISSSTE', 'Independiente', NO_DETERMINADO].map((n) => [
      clave(n),
      n,
    ]),
  ),
  ley: Object.fromEntries(
    [
      'Ley 73',
      'Ley 97',
      'Décimo Transitorio ISSSTE',
      'Cuenta Individual ISSSTE',
      'Mixto/revisar',
      NO_DETERMINADO,
    ].map((n) => [clave(n), n]),
  ),
  afore: {
    ...Object.fromEntries(
      [
        'Azteca',
        'Profuturo',
        'Citibanamex',
        'Coppel',
        'Inbursa',
        'Invercap',
        'PENSIONISSSTE',
        'Principal',
        'Sura',
        'XXI Banorte',
      ].map((n) => [clave(n), n]),
    ),
    // Alias conocidos.
    banamex: 'Citibanamex',
    'pension issste': 'PENSIONISSSTE',
  },
  estadoCivil: {
    soltero: 'soltero',
    soltera: 'soltero',
    'soltero (a)': 'soltero',
    casado: 'casado',
    casada: 'casado',
    'casado (a)': 'casado',
    divorciado: 'divorciado',
    divorciada: 'divorciado',
    'divorciado (a)': 'divorciado',
    viudo: 'viudo',
    viuda: 'viudo',
    'viudo (a)': 'viudo',
    concubinato: 'concubinato',
    'union libre': 'concubinato',
  },
};

// Alias que se anotan con su propio código de ajuste (no con el genérico catalogo_normalizado).
const AJUSTE_DE_ALIAS: Record<string, string> = { 'estadoCivil:union libre': 'estado_civil_alias' };

const ETIQUETA: Record<NombreCatalogo, string> = {
  regimen: 'régimen',
  ley: 'ley probable',
  afore: 'AFORE',
  estadoCivil: 'estado civil',
};

// Régimen y ley tienen valor neutro ("No determinado": vacío o desconocido pasa a él con advertencia);
// AFORE y estado civil no lo tienen: vacío o desconocido rechaza el renglón.
export function sanearCatalogo(raw: unknown, catalogo: NombreCatalogo): Saneado<string> {
  const r: Saneado<string> = { valor: null, ajustes: [], advertencias: [], rechazo: null };
  const original = typeof raw === 'string' ? raw : '';
  const texto = limpiarTexto(original).texto;
  const encontrado = texto === '' ? undefined : CATALOGOS[catalogo][clave(texto)];
  const etiqueta = ETIQUETA[catalogo];

  if (encontrado !== undefined) {
    const ajusteAlias = AJUSTE_DE_ALIAS[`${catalogo}:${clave(texto)}`];
    if (ajusteAlias) r.ajustes.push(ajusteAlias);
    else if (encontrado !== original) r.ajustes.push('catalogo_normalizado');
    r.valor = encontrado;
    return r;
  }
  const motivo = texto === '' ? 'viene vacío' : 'no está en el catálogo';
  if (catalogo === 'regimen' || catalogo === 'ley') {
    r.advertencias.push(
      `${catalogo}_desconocido: el ${etiqueta} ${motivo}; se carga "${NO_DETERMINADO}".`,
    );
    r.valor = NO_DETERMINADO;
  } else {
    r.rechazo = `El ${etiqueta} ${motivo}.`;
  }
  return r;
}

// Semanas cotizadas: entero de 0 en adelante. Texto no numérico ("N/D") da 0 con advertencia; negativo o
// con decimales rechaza; vacío da null (el validador decide qué hacer según la columna).
export function sanearSemanas(raw: unknown): Saneado<number> {
  const r: Saneado<number> = { valor: null, ajustes: [], advertencias: [], rechazo: null };
  if (raw === null || raw === undefined) return r;

  let numero: number;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      r.rechazo = 'Las semanas no son un número válido.';
      return r;
    }
    numero = raw;
  } else {
    const texto = limpiarTexto(typeof raw === 'string' ? raw : String(raw)).texto;
    if (texto === '' && typeof raw === 'string') return r;
    if (/^-?\d+(?:[.,]\d+)?$/.test(texto)) {
      numero = Number(texto.replace(',', '.'));
      r.ajustes.push('semanas_de_texto');
    } else {
      r.valor = 0;
      r.advertencias.push('semanas_no_numericas: las semanas no son un número y se cargan en 0.');
      return r;
    }
  }
  if (numero < 0 || !Number.isInteger(numero)) {
    r.ajustes = [];
    r.rechazo = 'Las semanas deben ser un número entero de 0 en adelante.';
    return r;
  }
  r.valor = numero;
  return r;
}
