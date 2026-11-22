import { readFile } from 'node:fs/promises';

// Equivalencias nombre del asesor en el Excel a correo de su usuario. El valor (la variable
// ETL_EQUIVALENCIAS o --equivalencias) puede ser la ruta de un JSON o el JSON mismo: el contenido se
// reconoce porque empieza con "{". Así funciona en plataformas sin disco persistente, donde no hay dónde
// dejar un archivo con correos reales sin versionarlo.
//
// Si algo falla lanza un error genérico: nunca cita el contenido ni la ruta (pueden traer correos).
export async function cargarEquivalencias(valor: string): Promise<Record<string, string>> {
  const texto = valor.trim();
  try {
    const crudo = texto.startsWith('{') ? texto : await readFile(texto, 'utf8');
    const datos: unknown = JSON.parse(crudo);
    if (
      typeof datos === 'object' &&
      datos !== null &&
      !Array.isArray(datos) &&
      Object.values(datos).every((v) => typeof v === 'string')
    ) {
      return datos as Record<string, string>;
    }
  } catch {
    // Se informa abajo, sin el texto del error.
  }
  throw new Error(
    'Las equivalencias de asesores no se pueden leer o no tienen el formato esperado.',
  );
}
