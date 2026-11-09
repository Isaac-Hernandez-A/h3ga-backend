import { CURP_REGEX } from '../clientes/dto/create-cliente.dto';

// Regla D2: qué correcciones F2 modifican el expediente (clientes) al finalizar la etapa 2.
// Las demás (Acta, AFORE, Actualización IMSS, Otro, Domicilio, INE, Unificación de NSS) solo registran el trámite.
// Se identifican por el nombre del catálogo `tipo_correccion` (docs/diccionario.md).
export type ColumnaCorregible = 'curp' | 'rfc' | 'fecha_nacimiento' | 'sexo' | 'nombre';

const COLUMNA_POR_TIPO: Record<string, ColumnaCorregible> = {
  'Corrección de CURP': 'curp',
  'Corrección de RFC': 'rfc',
  'Corrección de Fecha o Lugar de Nacimiento': 'fecha_nacimiento',
  'Corrección de Sexo / Género': 'sexo',
  'Corrección de Nombre y/o Apellidos': 'nombre',
};

// RFC de persona física (13) o moral (12): letras, fecha AAMMDD y homoclave.
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export function columnaDeCorreccion(nombreTipo: string): ColumnaCorregible | undefined {
  return COLUMNA_POR_TIPO[nombreTipo];
}

function esFechaReal(texto: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return false;
  const fecha = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return fecha.toISOString().slice(0, 10) === texto;
}

// Mensaje de error si `dato` no sirve como dato_correcto del tipo; null si es válido. Los tipos que
// actualizan el expediente lo exigen y validan su formato (así el expediente nunca recibe un dato malo).
export function errorDeDatoCorrecto(nombreTipo: string, dato?: string | null): string | null {
  const columna = columnaDeCorreccion(nombreTipo);
  if (!columna) return null;
  const valor = dato?.trim();
  if (!valor) return `dato_correcto es obligatorio en "${nombreTipo}".`;
  switch (columna) {
    case 'curp':
      return CURP_REGEX.test(valor) ? null : 'dato_correcto no tiene el formato de una CURP.';
    case 'rfc':
      return RFC_REGEX.test(valor) ? null : 'dato_correcto no tiene el formato de un RFC.';
    case 'fecha_nacimiento':
      return esFechaReal(valor) ? null : 'dato_correcto debe ser una fecha real AAAA-MM-DD.';
    case 'sexo':
      return valor === 'hombre' || valor === 'mujer'
        ? null
        : 'dato_correcto debe ser "hombre" o "mujer".';
    case 'nombre':
      return null;
  }
}
