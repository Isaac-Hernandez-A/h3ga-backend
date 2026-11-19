import { ESTATUS_ETAPA, EstatusEtapa, Saneado } from '../tipos';
import { limpiarTexto } from './texto';

// Saneador de estatus y avance de una etapa (Actividad 5, Tarea 6). El Excel trae el avance como fracción
// de 0 a 1; la base usa un entero de 0 a 100.
export interface EstatusAvance {
  estatus: EstatusEtapa;
  avance: number | null;
  motivo: string | null;
}

const MOTIVO_BLOQUEO = 'Importado desde Excel, sin motivo registrado';
const EN_PROCESO_MIN = 20;
const EN_PROCESO_MAX = 90;
const CONGELADOS: EstatusEtapa[] = ['Bloqueado', 'Cancelado', 'Detenido'];

const clave = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

const ESTATUS_POR_CLAVE = new Map(ESTATUS_ETAPA.map((e) => [clave(e), e]));

// Estatus que usa el Excel real y no son del sistema. "En proceso" solo es ambiguo (cliente, asesor o
// Instituto) y no tiene alias: rechaza.
const ALIAS_DE_ESTATUS = new Map<string, EstatusEtapa>([
  ['en revision asesor', 'En proceso asesor'],
]);

// Avance a entero de 0 a 100, o null si falta o no se entiende. De 0 a 1 es fracción; un entero entre 1 y
// 100 ya es porcentaje; con "%" siempre es porcentaje. Un número con decimales mayor que 1 ("1,5") no es
// ni fracción ni porcentaje: se descarta en vez de adivinar.
function leerAvance(raw: unknown): { pct: number | null; ajustes: string[] } {
  let n: number;
  let porcentaje = false;
  if (typeof raw === 'number') {
    n = raw;
  } else if (typeof raw === 'string') {
    let texto = limpiarTexto(raw).texto;
    if (texto.endsWith('%')) {
      porcentaje = true;
      texto = texto.slice(0, -1).trim();
    }
    if (!/^\d+(?:[.,]\d+)?$/.test(texto)) return { pct: null, ajustes: [] };
    n = Number(texto.replace(',', '.'));
  } else {
    return { pct: null, ajustes: [] };
  }
  if (!Number.isFinite(n) || n < 0) return { pct: null, ajustes: [] };
  if (porcentaje) {
    return n <= 100
      ? { pct: Math.round(n), ajustes: ['avance_en_porcentaje'] }
      : { pct: null, ajustes: [] };
  }
  if (n <= 1) return { pct: Math.round(n * 100), ajustes: [] };
  if (n <= 100 && Number.isInteger(n)) return { pct: n, ajustes: ['avance_en_porcentaje'] };
  return { pct: null, ajustes: [] };
}

export function sanearEstatusAvance(estatus: unknown, avance: unknown): Saneado<EstatusAvance> {
  const r: Saneado<EstatusAvance> = { valor: null, ajustes: [], advertencias: [], rechazo: null };
  const texto = typeof estatus === 'string' ? limpiarTexto(estatus).texto : '';
  const vacio =
    estatus === null || estatus === undefined || (typeof estatus === 'string' && texto === '');

  let nombre: EstatusEtapa;
  if (vacio) {
    // Una etapa sin estatus es una etapa que aún no se trabaja: se carga como Por iniciar, con aviso.
    nombre = 'Por iniciar';
    r.advertencias.push(
      'estatus_vacio_por_iniciar: el estatus de la etapa viene vacío; se carga Por iniciar.',
    );
  } else if (typeof estatus !== 'string') {
    r.rechazo = 'El estatus de la etapa no está en el catálogo.';
    return r;
  } else if (clave(texto) === 'en proceso') {
    r.rechazo = 'estatus ambiguo: indicar cliente, asesor o Instituto.';
    return r;
  } else if (ALIAS_DE_ESTATUS.has(clave(texto))) {
    nombre = ALIAS_DE_ESTATUS.get(clave(texto))!;
    r.advertencias.push(`estatus_alias: "${texto}" se carga como "${nombre}".`);
  } else {
    const encontrado = ESTATUS_POR_CLAVE.get(clave(texto));
    if (!encontrado) {
      r.rechazo = 'El estatus de la etapa no está en el catálogo.';
      return r;
    }
    nombre = encontrado;
    if (nombre !== estatus) r.ajustes.push('estatus_normalizado');
  }

  const { pct, ajustes } = leerAvance(avance);
  r.ajustes.push(...ajustes);
  let final: number | null;
  let motivo: string | null = null;

  if (nombre === 'No aplica') {
    final = null;
  } else if (nombre === 'Por iniciar') {
    final = 10;
    if (pct === 0) r.ajustes.push('avance_por_iniciar_a_10');
    else if (pct !== null && pct !== 10) {
      r.advertencias.push('avance_ajustado: Por iniciar siempre queda en 10.');
    }
  } else if (nombre === 'Finalizado') {
    final = 100;
    if (pct !== null && pct !== 100) {
      r.advertencias.push('avance_ajustado: Finalizado siempre queda en 100.');
    }
  } else if (CONGELADOS.includes(nombre)) {
    // El avance queda congelado: se conserva el que traiga el Excel.
    if (pct === null) {
      final = 0;
      r.advertencias.push('avance_faltante: sin avance válido; se carga en 0.');
    } else {
      final = pct;
    }
    if (nombre === 'Bloqueado') {
      motivo = MOTIVO_BLOQUEO;
      r.advertencias.push('bloqueado_sin_motivo: el Excel no trae motivo de bloqueo.');
    }
  } else {
    // En proceso (cliente, asesor o Instituto): entre 20 y 90.
    if (pct === null) {
      final = EN_PROCESO_MIN;
      r.advertencias.push('avance_faltante: sin avance válido; se carga en 20.');
    } else if (pct < EN_PROCESO_MIN || pct > EN_PROCESO_MAX) {
      final = Math.min(Math.max(pct, EN_PROCESO_MIN), EN_PROCESO_MAX);
      r.advertencias.push(
        'avance_fuera_de_rango: En proceso va de 20 a 90; se lleva al valor más cercano.',
      );
    } else {
      final = pct;
      if (pct % 10 !== 0) {
        r.advertencias.push(
          'avance_no_multiplo_de_10: el avance no es múltiplo de 10 y se carga tal cual.',
        );
      }
    }
  }
  r.valor = { estatus: nombre, avance: final, motivo };
  return r;
}
