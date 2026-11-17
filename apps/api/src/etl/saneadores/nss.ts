import { Saneado } from '../tipos';
import { limpiarTexto } from './texto';

// Saneador de NSS (Actividad 5, Tarea 5). Acepta número o texto con guiones, puntos y espacios; debe
// quedar de exactamente 11 dígitos. Los mensajes nunca incluyen el NSS.
const sinAcentos = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').trim().toUpperCase();

export function sanearNss(raw: unknown, regimen: string | null): Saneado<string> {
  const r: Saneado<string> = { valor: null, ajustes: [], advertencias: [], rechazo: null };

  let texto = '';
  let eraTexto = false;
  let ceroInicial = false;
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw < 0) {
      r.rechazo = 'El NSS no es un número entero válido.';
      return r;
    }
    texto = String(raw);
    // Excel guarda el NSS como número y pierde el cero inicial: de 10 dígitos se completa con un cero.
    if (texto.length === 10) {
      texto = `0${texto}`;
      ceroInicial = true;
    }
  } else if (typeof raw === 'string') {
    eraTexto = true;
    texto = limpiarTexto(raw).texto;
  } else if (raw !== null && raw !== undefined) {
    r.rechazo = 'El NSS no es un texto ni un número.';
    return r;
  }

  if (texto === '') {
    // Un NSS vacío solo es esperado en el régimen ISSSTE.
    if (sinAcentos(regimen ?? '') !== 'ISSSTE') {
      r.advertencias.push('nss_vacio: el cliente no es ISSSTE y no trae NSS.');
    }
    return r;
  }

  const nss = texto.replace(/[\s.-]/g, '');
  if (!/^\d{11}$/.test(nss)) {
    r.rechazo = 'El NSS no tiene exactamente 11 dígitos.';
    return r;
  }
  if (ceroInicial) r.ajustes.push('nss_cero_inicial');
  else if (eraTexto && nss !== raw) r.ajustes.push('nss_normalizado');
  r.valor = nss;
  return r;
}
