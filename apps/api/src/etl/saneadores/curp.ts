import { Saneado } from '../tipos';
import { limpiarTexto } from './texto';

// Saneador de CURP (Actividad 5, Tarea 5). Solo formato y coherencia de fecha: no se valida el dígito
// verificador. Los mensajes nunca incluyen la CURP (es un dato personal).
//
// Formato de 18 posiciones: 4 letras, fecha aammdd, sexo H o M, estado de 2 letras, 3 consonantes
// internas, homoclave (letra o dígito) y dígito. El formato oficial pide una vocal en la segunda
// posición, pero las CURP ficticias del fixture no la traen, así que aquí basta con una letra.
const ESTADOS =
  'AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE';
const CURP = new RegExp(
  `^[A-Z]{4}(\\d{2})(\\d{2})(\\d{2})([HM])(?:${ESTADOS})[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\\d$`,
);

// La fecha existe en el calendario. El siglo sale de la homoclave: dígito es siglo XX y letra, XXI.
function fechaExiste(aa: number, mm: number, dd: number, homoclave: string): boolean {
  const anio = (/\d/.test(homoclave) ? 1900 : 2000) + aa;
  const fecha = new Date(Date.UTC(2000, mm - 1, dd));
  fecha.setUTCFullYear(anio);
  return fecha.getUTCMonth() === mm - 1 && fecha.getUTCDate() === dd;
}

export function sanearCurp(raw: unknown, nacimiento: Date | null): Saneado<string> {
  const r: Saneado<string> = { valor: null, ajustes: [], advertencias: [], rechazo: null };
  const original = typeof raw === 'string' ? raw : '';
  const curp = limpiarTexto(original).texto.replace(/[\s-]/g, '').toUpperCase();
  if (curp === '') {
    r.rechazo = 'La CURP viene vacía.';
    return r;
  }
  const partes = CURP.exec(curp);
  if (!partes) {
    r.rechazo = 'La CURP no tiene el formato de 18 caracteres.';
    return r;
  }
  const [, aa, mm, dd] = partes;
  if (!fechaExiste(+aa, +mm, +dd, curp[16])) {
    r.rechazo = 'La CURP trae una fecha de nacimiento que no existe.';
    return r;
  }
  if (curp !== original) r.ajustes.push('curp_normalizada');
  if (
    nacimiento &&
    (nacimiento.getUTCFullYear() % 100 !== +aa ||
      nacimiento.getUTCMonth() + 1 !== +mm ||
      nacimiento.getUTCDate() !== +dd)
  ) {
    r.advertencias.push(
      'curp_no_coincide_con_nacimiento: la fecha de la CURP difiere de la fecha de nacimiento.',
    );
  }
  r.valor = curp;
  return r;
}

// Sexo del carácter 11 de la CURP (H = hombre, M = mujer). Se llama con una CURP ya saneada.
export function sexoDeCurp(curp: string): 'H' | 'M' {
  return curp.charAt(10) === 'M' ? 'M' : 'H';
}
