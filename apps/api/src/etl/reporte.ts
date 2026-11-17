import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ReporteEtl } from './tipos';

// Reporte de una importación (Actividad 5, Tarea 10): enmascarado de datos personales, códigos rutinarios
// y escritura de reporte.json y rechazados.csv. CURP y NSS nunca salen completos.

// Muestra solo los últimos 4 caracteres y conserva la longitud. Un valor de 4 caracteres o menos queda
// totalmente oculto.
export function enmascarar(valor: string): string {
  if (valor.length <= 4) return '•'.repeat(valor.length);
  return '•'.repeat(valor.length - 4) + valor.slice(-4);
}

// Códigos rutinarios o estructurales (decisión de Isaac tras la Tarea 8): son lo normal en una carga desde
// este Excel y no deben contar en conAjustes ni en conAdvertencias. El resumen por código sí los incluye.
const RUTINARIOS = [
  'nombre_dividido', // el Excel trae un solo nombre
  'avance_por_iniciar_a_10', // el Excel trae Por iniciar con avance 0
  'campos_pendientes_de_captura', // campos que el Excel no trae
  'objetivo_asumido',
];
// El alias Mixto / revisar de la hoja Catálogo del Excel es un valor normal, no un error de captura.
const ALIAS_RUTINARIOS = ['Ley probable: catalogo_normalizado'];

export function esRutinario(mensaje: string): boolean {
  return (
    RUTINARIOS.some((codigo) => mensaje.includes(codigo)) || ALIAS_RUTINARIOS.includes(mensaje)
  );
}

// Código snake_case de un mensaje de ajuste o advertencia ("Etapa 1: avance_fuera_de_rango: ...").
export function codigoDe(mensaje: string): string | null {
  return /[a-z]+(?:_[a-z0-9]+)+/.exec(mensaje)?.[0] ?? null;
}

// Marca de orden de bytes UTF-8 al inicio del CSV.
const BOM = String.fromCharCode(0xfeff);

const campoCsv = (valor: string | number | null): string => {
  const texto = valor === null ? '' : String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

// Escribe reporte.json y rechazados.csv (una fila por renglón rechazado) en la carpeta, que se crea si no
// existe. El CSV lleva BOM para que Excel lea bien los acentos.
export async function escribirReporte(
  carpeta: string,
  reporte: ReporteEtl,
): Promise<{ json: string; csv: string }> {
  await mkdir(carpeta, { recursive: true });
  const json = join(carpeta, 'reporte.json');
  const csv = join(carpeta, 'rechazados.csv');
  const filas = reporte.renglones
    .filter((r) => r.clase === 'rechazado')
    .map((r) => [r.fila, r.idExcel, r.curp, r.nss, r.rechazos.join(' | ')].map(campoCsv).join(','));
  await writeFile(json, JSON.stringify(reporte, null, 2), 'utf8');
  await writeFile(
    csv,
    `${BOM}${['fila,id_excel,curp,nss,motivos', ...filas].join('\n')}\n`,
    'utf8',
  );
  return { json, csv };
}

// Nombre de la subcarpeta de una corrida: fecha UTC, hora, huella del archivo e identificador propio.
// Lo genera el servidor; nada del nombre del archivo subido entra en la ruta.
export function subcarpetaDeCorrida(huellaSha256: string): string {
  const iso = new Date().toISOString();
  return [
    iso.slice(0, 10).replace(/-/g, ''),
    iso.slice(11, 19).replace(/:/g, ''),
    huellaSha256.slice(0, 8),
    randomBytes(2).toString('hex'),
  ].join('-');
}
