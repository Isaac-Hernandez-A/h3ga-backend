import { Saneado } from '../tipos';

// Saneadores de nombre, correo y teléfono (Actividad 5, Tarea 3). Funciones puras. Los mensajes de ajuste
// y advertencia son códigos o frases fijas: nunca incluyen el valor original (puede ser un dato personal).

const INVISIBLES = new RegExp('\u200B|\u200C|\u200D|\u2060|\uFEFF|\u00AD', 'g');
const ESPACIOS_RAROS = new RegExp('\u00A0|\u2007|\u202F|\u3000', 'g');
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

const vacio = (): Saneado<string> => ({
  valor: null,
  ajustes: [],
  advertencias: [],
  rechazo: null,
});

// Convierte la celda a texto: texto tal cual, números como entero sin notación científica, resto vacío.
function aTexto(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw));
  return '';
}

// Texto general: NFC, sin invisibles, espacios raros como espacio normal, sin espacios de más.
// Devuelve el texto limpio y los ajustes aplicados.
function limpiarTexto(raw: string): { texto: string; ajustes: string[] } {
  const ajustes: string[] = [];
  let texto = raw;
  if (texto !== texto.normalize('NFC')) {
    texto = texto.normalize('NFC');
    ajustes.push('unicode_normalizado');
  }
  const sinInvisibles = texto.replace(INVISIBLES, '').replace(ESPACIOS_RAROS, ' ');
  if (sinInvisibles !== texto) {
    texto = sinInvisibles;
    ajustes.push('caracteres_invisibles');
  }
  const sinEspacios = texto.replace(/\s+/g, ' ').trim();
  if (sinEspacios !== texto) {
    texto = sinEspacios;
    ajustes.push('espacios');
  }
  return { texto, ajustes };
}

function nombrePropio(texto: string): string {
  return texto
    .split(' ')
    .map((palabra, i) => {
      const minuscula = palabra.toLocaleLowerCase('es');
      if (i > 0 && PARTICULAS.has(minuscula)) return minuscula;
      return minuscula.charAt(0).toLocaleUpperCase('es') + minuscula.slice(1);
    })
    .join(' ');
}

export function sanearNombre(raw: unknown): Saneado<string> {
  const r = vacio();
  const { texto, ajustes } = limpiarTexto(aTexto(raw));
  if (texto === '') {
    r.rechazo = 'El nombre del cliente viene vacío.';
    return r;
  }
  r.ajustes.push(...ajustes);
  const todoMayusculas = texto === texto.toLocaleUpperCase('es');
  const todoMinusculas = texto === texto.toLocaleLowerCase('es');
  if (todoMayusculas || todoMinusculas) {
    const propio = nombrePropio(texto);
    if (propio !== texto) r.ajustes.push('nombre_propio');
    r.valor = propio;
  } else {
    r.valor = texto;
  }
  return r;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanearCorreo(raw: unknown): Saneado<string> {
  const r = vacio();
  const original = aTexto(raw);
  const { texto } = limpiarTexto(original);
  if (texto === '') return r;
  const correo = texto.toLowerCase();
  if (!CORREO.test(correo)) {
    r.advertencias.push('correo_invalido: el correo no tiene un formato válido y se carga vacío.');
    return r;
  }
  if (correo !== original) r.ajustes.push('correo_normalizado');
  r.valor = correo;
  return r;
}

export function sanearTelefono(raw: unknown): Saneado<string> {
  const r = vacio();
  const original = aTexto(raw);
  if (limpiarTexto(original).texto === '') return r;
  let digitos = original.replace(/\D/g, '');
  if (digitos.length === 12 && digitos.startsWith('52')) digitos = digitos.slice(2);
  if (digitos.length !== 10) {
    r.advertencias.push('telefono_invalido: el teléfono no tiene 10 dígitos y se carga vacío.');
    return r;
  }
  if (digitos !== original) r.ajustes.push('telefono_normalizado');
  r.valor = digitos;
  return r;
}

// Divide el nombre único del Excel en nombre y dos apellidos (sección 15 de la especificación): con 3
// palabras, 1 nombre y 2 apellidos; con 4, 2 y 2; con 2, nombre y paterno. Las partículas (de, del, la,
// los, y) se pegan al apellido que les sigue. El llamador anota el ajuste nombre_dividido.
export function dividirNombre(nombre: string): {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
} {
  const palabras = nombre.split(/\s+/).filter(Boolean);
  // Unidades: cada partícula se une con la palabra siguiente; una partícula final se une a la anterior.
  const unidades: string[] = [];
  let pendiente: string[] = [];
  for (const palabra of palabras) {
    pendiente.push(palabra);
    if (!PARTICULAS.has(palabra.toLocaleLowerCase('es'))) {
      unidades.push(pendiente.join(' '));
      pendiente = [];
    }
  }
  if (pendiente.length > 0) {
    if (unidades.length > 0) unidades[unidades.length - 1] += ' ' + pendiente.join(' ');
    else unidades.push(pendiente.join(' '));
  }
  if (unidades.length === 1)
    return { nombre: unidades[0], apellidoPaterno: '', apellidoMaterno: '' };
  if (unidades.length === 2) {
    return { nombre: unidades[0], apellidoPaterno: unidades[1], apellidoMaterno: '' };
  }
  return {
    nombre: unidades.slice(0, -2).join(' '),
    apellidoPaterno: unidades[unidades.length - 2],
    apellidoMaterno: unidades[unidades.length - 1],
  };
}
