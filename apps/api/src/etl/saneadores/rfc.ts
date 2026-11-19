import { Saneado } from '../tipos';
import { limpiarTexto } from './texto';

// Saneador de RFC (Actividad 5, Tarea 5). Mayúsculas y sin espacios; 12 caracteres (persona moral) o 13
// (persona física). Si no cumple se carga vacío con advertencia. Los mensajes nunca incluyen el RFC.
const RFC = /^[A-ZÑ&0-9]{12,13}$/;

export function sanearRfc(raw: unknown): Saneado<string> {
  const r: Saneado<string> = { valor: null, ajustes: [], advertencias: [], rechazo: null };
  const original =
    typeof raw === 'string' ? raw : raw === null || raw === undefined ? '' : String(raw);
  const rfc = limpiarTexto(original).texto.replace(/\s/g, '').toUpperCase();
  if (rfc === '') return r;
  if (!RFC.test(rfc)) {
    r.advertencias.push(
      'rfc_invalido: el RFC no tiene 12 o 13 caracteres válidos y se carga vacío.',
    );
    return r;
  }
  if (rfc !== original) r.ajustes.push('rfc_normalizado');
  r.valor = rfc;
  return r;
}
