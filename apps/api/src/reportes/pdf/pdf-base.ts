import { join } from 'node:path';
import PDFDocument from 'pdfkit';

// Piezas comunes de los PDF corporativos de H3GA (F0 y reporte operativo): carta, márgenes del formato Word
// oficial, encabezado con logo en cada página, fuente Caladea (equivalente métrico libre de Cambria) y tablas
// con cabecera azul. Medidas tomadas del .docx del F0 (twips: 1 pt = 20 twips).
export type Doc = InstanceType<typeof PDFDocument>;

const FUENTES = join(__dirname, 'fuentes');
const LOGO = join(__dirname, 'assets', 'logo-h3ga.png');

export const AZUL_TITULO = '#003366';
export const AZUL_SECCION = '#00468C';
export const AZUL_TABLA = '#1F4E78';

export const ALTO_PAGINA = 792;
export const MARGEN_X = 56.7; // 1134 twips
export const ANCHO = 498.6; // 9972 twips
export const INICIO_CUERPO = 134;
export const LIMITE_INFERIOR = ALTO_PAGINA - 45;
export const ALTO_FILA = 13.3;
export const RELLENO_X = 5.4;
export const RELLENO_Y = 0.6;
export const tw = (twips: number): number => twips / 20;

export const CUERPO = 'Cuerpo';
export const NEGRITA = 'Negrita';
export const CURSIVA = 'Cursiva';

export interface Celda {
  ancho: number; // twips
  texto?: string;
  cabecera?: boolean;
  centrado?: boolean;
  derecha?: boolean;
  negrita?: boolean;
  tamano?: number; // pt; por defecto 10
  relleno?: number; // margen horizontal interno en pt; por defecto RELLENO_X
  // Casilla a la izquierda de la celda (undefined = sin casilla) y texto que la acompaña.
  casilla?: boolean;
  extra?: { etiqueta: string; valor: string };
}

export const etiqueta = (texto: string, ancho: number): Celda => ({ ancho, texto });
export const valor = (texto: string, ancho: number): Celda => ({ ancho, texto });

// Encabezado de cada página: título corporativo, `subtitulo` (el nombre del documento), unidad, lema y logo.
export function encabezado(doc: Doc, subtitulo: string): void {
  const x = MARGEN_X;
  const ancho = 398.4; // el texto se centra a la izquierda del logo
  doc.fillColor(AZUL_TITULO).font(NEGRITA).fontSize(22);
  doc.text('CONSULTORÍA EN PENSIONES', x, 34, { width: ancho, align: 'center', lineBreak: false });
  doc.font(CUERPO).fontSize(20);
  doc.text(subtitulo, x, 62, { width: ancho, align: 'center', lineBreak: false });
  doc.font(NEGRITA).fontSize(12);
  doc.text('UNIDAD PREMIUM', x, 87, { width: ancho, align: 'center', lineBreak: false });
  doc.fillColor('black').font(CURSIVA).fontSize(9);
  doc.text(
    'Pensión IMSS/ISSSTE • Modalidad 10 • Modalidad 40 • Corrección de Datos • Recuperación de Semanas',
    x,
    112,
    { width: ancho, align: 'center', lineBreak: false },
  );
  doc.image(LOGO, 464.6, 37, { width: 86.9 });
  doc.x = MARGEN_X;
  doc.y = INICIO_CUERPO;
}

// Crea el documento: carta con los márgenes del formato, fuentes registradas y encabezado en cada página
// (la primera, las explícitas y las que agrega pdfkit por desbordamiento). `terminado` entrega el PDF al
// llamar doc.end().
export function crearDocumento(opciones: { titulo: string; subtitulo: string }): {
  doc: Doc;
  nuevaPagina: () => number;
  terminado: Promise<Buffer>;
} {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: INICIO_CUERPO, bottom: 45, left: MARGEN_X, right: MARGEN_X },
    info: { Title: opciones.titulo, Author: 'H3GA Seguros y Pensiones' },
  });
  doc.registerFont(CUERPO, join(FUENTES, 'Caladea-Regular.ttf'));
  doc.registerFont(NEGRITA, join(FUENTES, 'Caladea-Bold.ttf'));
  doc.registerFont(CURSIVA, join(FUENTES, 'Caladea-Italic.ttf'));
  const terminado = new Promise<Buffer>((resolver, rechazar) => {
    const partes: Buffer[] = [];
    doc.on('data', (p: Buffer) => partes.push(p));
    doc.on('end', () => resolver(Buffer.concat(partes)));
    doc.on('error', rechazar);
  });
  doc.on('pageAdded', () => encabezado(doc, opciones.subtitulo));
  encabezado(doc, opciones.subtitulo);
  const nuevaPagina = (): number => {
    doc.addPage();
    return INICIO_CUERPO;
  };
  return { doc, nuevaPagina, terminado };
}

export function titulo(doc: Doc, y: number, texto: string): void {
  doc.fillColor(AZUL_SECCION).font(NEGRITA).fontSize(15);
  doc.text(texto, MARGEN_X, y, { lineBreak: false });
  doc.fillColor('black');
}

export function casilla(doc: Doc, x: number, y: number, marcada: boolean): void {
  doc.lineWidth(0.7).strokeColor('black').rect(x, y, 8, 8).stroke();
  if (marcada) {
    doc
      .lineWidth(1.2)
      .moveTo(x + 1.6, y + 1.6)
      .lineTo(x + 6.4, y + 6.4)
      .stroke();
    doc
      .moveTo(x + 6.4, y + 1.6)
      .lineTo(x + 1.6, y + 6.4)
      .stroke();
  }
}

function fuenteDe(c: Celda): string {
  return c.cabecera || c.negrita ? NEGRITA : CUERPO;
}

function alturaCelda(doc: Doc, c: Celda): number {
  const ancho = tw(c.ancho) - 2 * (c.relleno ?? RELLENO_X) - (c.casilla !== undefined ? 14 : 0);
  // "No.:" con número: el número va en un segundo renglón, porque la celda del formato es muy angosta.
  if (c.extra?.valor) return 2 * ALTO_FILA - 2;
  if (!c.texto) return ALTO_FILA;
  doc.font(fuenteDe(c)).fontSize(c.tamano ?? 10);
  return Math.max(ALTO_FILA, doc.heightOfString(c.texto, { width: ancho }) + 2 * RELLENO_Y);
}

// Dibuja una fila de tabla en `y` y devuelve su alto. Si no cabe en la página, la pasa a la siguiente.
function fila(
  doc: Doc,
  y: number,
  celdas: Celda[],
  nuevaPagina: () => number,
): { y: number; alto: number } {
  const alto = Math.max(...celdas.map((c) => alturaCelda(doc, c)));
  if (y + alto > LIMITE_INFERIOR) y = nuevaPagina();
  let x = MARGEN_X;
  for (const c of celdas) {
    const ancho = tw(c.ancho);
    doc.lineWidth(0.5).strokeColor('black');
    if (c.cabecera) {
      doc.rect(x, y, ancho, alto).fillAndStroke(AZUL_TABLA, 'black');
    } else {
      doc.rect(x, y, ancho, alto).stroke();
    }
    const relleno = c.relleno ?? RELLENO_X;
    let xTexto = x + relleno;
    if (c.casilla !== undefined) {
      casilla(doc, xTexto - 1, y + (ALTO_FILA - 8) / 2, c.casilla);
      xTexto += 14;
    }
    doc
      .fillColor(c.cabecera ? 'white' : 'black')
      .font(fuenteDe(c))
      .fontSize(c.tamano ?? 10);
    if (c.extra) {
      // "No.:" junto a la casilla y, debajo, el número ajustado al ancho de la celda.
      const { etiqueta: rotulo, valor: numero } = c.extra;
      doc.text(rotulo, xTexto, y + RELLENO_Y, { lineBreak: false });
      if (numero) {
        const disponible = ancho - 2 * relleno;
        let tamano = 10;
        while (tamano > 6 && doc.fontSize(tamano).widthOfString(numero) > disponible) tamano -= 0.5;
        doc.fontSize(tamano).text(numero, x + relleno, y + RELLENO_Y + 11.5, { lineBreak: false });
      }
    } else if (c.texto) {
      doc.text(c.texto, xTexto, y + RELLENO_Y, {
        width: ancho - 2 * relleno - (c.casilla !== undefined ? 14 : 0),
        align: c.centrado ? 'center' : c.derecha ? 'right' : 'left',
      });
    }
    doc.fillColor('black');
    x += ancho;
  }
  return { y, alto };
}

// Dibuja todas las filas; devuelve el borde inferior de la tabla.
export function tabla(doc: Doc, y: number, filas: Celda[][], nuevaPagina: () => number): number {
  let actual = y;
  for (const celdas of filas) {
    const r = fila(doc, actual, celdas, nuevaPagina);
    actual = r.y + r.alto;
  }
  return actual;
}

// Parte `texto` en renglones que caben en `ancho` (respeta los saltos de línea).
export function renglones(doc: Doc, texto: string, ancho: number): string[] {
  doc.font(CUERPO).fontSize(10);
  const salida: string[] = [];
  for (const parrafo of texto.split(/\r?\n/)) {
    let actual = '';
    for (const palabra of parrafo.split(/\s+/).filter((p) => p !== '')) {
      const prueba = actual === '' ? palabra : `${actual} ${palabra}`;
      if (actual !== '' && doc.widthOfString(prueba) > ancho) {
        salida.push(actual);
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    salida.push(actual);
  }
  return salida;
}
