// Reglas de los archivos subidos (D5): PDF, JPG o PNG, máximo 10 MB. Funciones puras.

export const TAMANO_MAXIMO = 10 * 1024 * 1024;

// eslint-disable-next-line no-control-regex
const CARACTERES_DE_CONTROL = /[\u0000-\u001f\u007f]/g;

interface FormatoPermitido {
  extension: string;
  // El tipo declarado por el cliente no basta: se comprueba la firma real del contenido.
  tieneFirma: (contenido: Buffer) => boolean;
}

const FORMATOS: Record<string, FormatoPermitido> = {
  'application/pdf': {
    extension: 'pdf',
    tieneFirma: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  },
  'image/jpeg': {
    extension: 'jpg',
    tieneFirma: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    tieneFirma: (b) =>
      b.length >= 8 &&
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
};

// Tipos de documento de los que el cliente tiene UNO vigente: subir otro reemplaza al anterior. El resto
// (recibos de nómina, comprobantes de pago, estados de cuenta, resoluciones...) se acumula.
export const TIPOS_DOCUMENTO_UNICOS: readonly string[] = [
  'Acta de Nacimiento',
  'CURP',
  'INE',
  'Comprobante de Domicilio',
  'RFC',
  'Constancia de Semanas Cotizadas (IMSS)',
];

// Mensaje de error si el archivo no es válido; si lo es, null y la extensión que le corresponde.
export function validarArchivo(archivo: {
  buffer: Buffer;
  mimetype: string;
  size: number;
}): { error: string } | { extension: string } {
  const formato = FORMATOS[archivo.mimetype];
  if (!formato) return { error: 'Solo se aceptan archivos PDF, JPG o PNG.' };
  if (archivo.size <= 0 || archivo.buffer.length === 0) return { error: 'El archivo está vacío.' };
  if (archivo.size > TAMANO_MAXIMO || archivo.buffer.length > TAMANO_MAXIMO) {
    return { error: 'El archivo supera el máximo de 10 MB.' };
  }
  if (!formato.tieneFirma(archivo.buffer)) {
    return { error: 'El contenido del archivo no corresponde al tipo indicado.' };
  }
  return { extension: formato.extension };
}

// Nombre original seguro para guardar y devolver en el encabezado de descarga: sin rutas ni caracteres
// de control. multer entrega el nombre decodificado como latin1; se recupera el UTF-8 original.
export function limpiarNombre(original: string, extension: string): string {
  const utf8 = Buffer.from(original, 'latin1').toString('utf8');
  const decodificado = utf8.includes('�') ? original : utf8;
  const base = decodificado.split(/[\\/]/).pop() ?? '';
  const limpio = base.replace(CARACTERES_DE_CONTROL, '').trim().slice(0, 200);
  return limpio === '' || limpio === '.' || limpio === '..' ? `archivo.${extension}` : limpio;
}
