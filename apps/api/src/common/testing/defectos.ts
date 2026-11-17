import { enmascarar, esRutinario } from '../../etl/reporte';
import { ReporteEtl } from '../../etl/tipos';

// Ayudante de pruebas y de evidencia (Actividad 5, Tarea 13): lee test/fixtures/etl/defectos-sembrados.csv,
// compara cada defecto sembrado con lo que reportó la ETL y arma defectos-vs-resultado.md. La columna
// "Valor limpio" del CSV es el valor del renglón ANTES de sembrar el defecto, no el resultado esperado.
export interface Defecto {
  id: number;
  fila: number;
  columna: string;
  etapa: string;
  valorLimpio: string;
  valorSembrado: string;
  defecto: string;
  clase: 'saneable' | 'advertencia' | 'rechazo' | 'duplicado' | 'posible duplicado';
}

type RenglonReporte = ReporteEtl['renglones'][number];

// Marca de orden de bytes UTF-8 al inicio del CSV.
const BOM = String.fromCharCode(0xfeff);

// CSV con campos entre comillas (RFC 4180) y BOM opcional.
export function leerCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  const limpio = texto.replace(BOM, '');
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(campo);
      campo = '';
      if (fila.some((x) => x !== '')) filas.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}

export function leerDefectos(csv: string): Defecto[] {
  const [, ...filas] = leerCsv(csv);
  return filas.map((f) => ({
    id: Number(f[0]),
    fila: Number(f[1]),
    columna: f[2],
    etapa: f[3],
    valorLimpio: f[4],
    valorSembrado: f[5],
    defecto: f[6],
    clase: f[7] as Defecto['clase'],
  }));
}

const noRutinarios = (mensajes: string[]) => mensajes.filter((m) => !esRutinario(m));

// ¿El renglón del reporte refleja el defecto según su clase propuesta? Con una descripción corta del
// resultado obtenido.
export function resultadoDe(
  defecto: Defecto,
  renglon: RenglonReporte | undefined,
): { coincide: boolean; resultado: string } {
  if (!renglon) return { coincide: false, resultado: 'El renglón no aparece en el reporte.' };
  const cargado = renglon.clase === 'cargado';
  const ajustes = noRutinarios(renglon.ajustes);
  const advertencias = noRutinarios(renglon.advertencias);
  switch (defecto.clase) {
    case 'saneable':
      return {
        coincide: cargado,
        resultado: cargado
          ? ajustes.length > 0
            ? `Cargado con ajustes: ${ajustes.join('; ')}`
            : 'Cargado; la normalización es silenciosa y no deja ajuste anotado'
          : `Rechazado: ${renglon.rechazos.join('; ')}`,
      };
    case 'advertencia':
      return {
        coincide: cargado && advertencias.length > 0,
        resultado: cargado
          ? `Cargado con advertencias: ${advertencias.join('; ')}`
          : `Rechazado: ${renglon.rechazos.join('; ')}`,
      };
    case 'posible duplicado': {
      const aviso = renglon.advertencias.find((m) => m.includes('posible_duplicado'));
      return {
        coincide: cargado && aviso !== undefined,
        resultado: aviso
          ? `Cargado con advertencia: ${aviso}`
          : 'Sin la advertencia de posible duplicado',
      };
    }
    case 'rechazo':
      return {
        coincide: !cargado && renglon.rechazos.length > 0,
        resultado: cargado
          ? 'Cargado (debía rechazarse)'
          : `Rechazado: ${renglon.rechazos.join('; ')}`,
      };
    case 'duplicado':
      return {
        coincide: !cargado && renglon.rechazos.some((m) => /duplicado en el archivo/i.test(m)),
        resultado: cargado
          ? 'Cargado (debía rechazarse)'
          : `Rechazado: ${renglon.rechazos.join('; ')}`,
      };
  }
}

// Las columnas de CURP (G) y NSS (O) nunca van completas en la evidencia.
const mostrar = (columna: string, valor: string) =>
  valor !== '' && (columna === 'G' || columna === 'O')
    ? enmascarar(valor.replace(/[\s-]/g, ''))
    : valor;
const celda = (texto: string) => texto.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function armarMarkdown(defectos: Defecto[], reporte: ReporteEtl): string {
  const porFila = new Map(reporte.renglones.map((r) => [r.idExcel, r]));
  const filas = defectos.map((d) => ({ d, ...resultadoDe(d, porFila.get(d.id)) }));
  const coinciden = filas.filter((f) => f.coincide).length;
  const t = reporte.totales;
  const lineas = [
    '# Defectos sembrados contra resultado de la importación',
    '',
    `Corrida con el Excel ficticio \`${reporte.cabecera.archivo}\` (huella SHA-256 \`${reporte.cabecera.huellaSha256}\`). Datos ficticios; CURP y NSS aparecen enmascarados.`,
    '',
    `- Renglones leídos: ${t.leidos}. Cargados: ${t.cargados}. Rechazados: ${t.rechazados} (${t.duplicadosEnArchivo} por duplicado en el archivo).`,
    `- Defectos sembrados: ${defectos.length}. Reflejados según su clase propuesta: ${coinciden} de ${defectos.length}.`,
    '- La columna "Valor limpio" del catálogo de defectos es el valor del renglón antes de sembrar el defecto, no el resultado esperado de la ETL: por ejemplo, un nombre sin acentos se carga tal cual, porque la ETL no inventa acentos.',
    '',
    '| ID | Fila | Columna | Defecto | Valor sembrado | Clase propuesta | Resultado obtenido | ¿Coincide? |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...filas.map(
      ({ d, resultado, coincide }) =>
        `| ${d.id} | ${d.fila} | ${d.columna} | ${celda(d.defecto)} | ${celda(mostrar(d.columna, d.valorSembrado))} | ${d.clase} | ${celda(resultado)} | ${coincide ? 'Sí' : 'NO'} |`,
    ),
    '',
  ];
  return lineas.join('\n');
}
