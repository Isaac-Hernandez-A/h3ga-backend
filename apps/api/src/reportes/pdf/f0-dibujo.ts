import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { ModeloF0 } from './f0-modelo';

// Dibuja el formato F0 "F0. Diagnóstico Inicial VF2" (Word) en PDF: carta, mismos márgenes, encabezado con
// logo en cada página, las 6 secciones y sus tablas. Medidas tomadas del .docx (twips: 1 pt = 20 twips);
// fuente Caladea (equivalente métrico libre de Cambria, la del formato).
type Doc = InstanceType<typeof PDFDocument>;

const FUENTES = join(__dirname, 'fuentes');
const LOGO = join(__dirname, 'assets', 'logo-h3ga.png');

const AZUL_TITULO = '#003366';
const AZUL_SECCION = '#00468C';
const AZUL_TABLA = '#1F4E78';

const ALTO_PAGINA = 792;
const MARGEN_X = 56.7; // 1134 twips
const ANCHO = 498.6; // 9972 twips
const INICIO_CUERPO = 134;
const LIMITE_INFERIOR = ALTO_PAGINA - 45;
const ALTO_FILA = 13.3;
const RELLENO_X = 5.4;
const RELLENO_Y = 0.6;
const tw = (twips: number) => twips / 20;

const CUERPO = 'Cuerpo';
const NEGRITA = 'Negrita';
const CURSIVA = 'Cursiva';

const NOTAS = [
  'Documento diseñado para control interno y seguimiento de clientes.',
  'Protección De Datos Personales (Aviso De Privacidad): el cliente reconoce y acepta que, para la ejecución del presente contrato, entrega a H3GA SEGUROS Y PENSIONES sus datos personales los cuales serán tratados conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP); mismos que serán utilizados exclusivamente para la asesoría técnica en materia de pensiones y jubilaciones. El cliente podrá ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición, así como revocar su consentimiento, enviando una solicitud por escrito al correo electrónico oficial: asistentehega@gmail.com. El texto completo del Aviso de Privacidad Integral, con todos sus detalles y actualizaciones, se encuentra disponible para su consulta permanente en el portal web: https://h3ga.vercel.app/.',
  'El presente formato es una herramienta de diagnóstico y planeación. Los cálculos son estimados, con base en la información y documentación proporcionada por el cliente y deben validarse con documentación oficial del IMSS, AFORE y, en su caso, con la resolución emitida por la autoridad competente. La recomendación puede cambiar si existen diferencias en semanas reconocidas, salario base, conservación de derechos, régimen aplicable, edad, topes legales, criterios administrativos o documentación del cliente.',
];

interface Celda {
  ancho: number; // twips
  texto?: string;
  cabecera?: boolean;
  centrado?: boolean;
  // Casilla a la izquierda de la celda (undefined = sin casilla) y texto que la acompaña.
  casilla?: boolean;
  extra?: { etiqueta: string; valor: string };
}

function encabezado(doc: Doc): void {
  const x = MARGEN_X;
  const ancho = 398.4; // el texto se centra a la izquierda del logo
  doc.fillColor(AZUL_TITULO).font(NEGRITA).fontSize(22);
  doc.text('CONSULTORÍA EN PENSIONES', x, 34, { width: ancho, align: 'center', lineBreak: false });
  doc.font(CUERPO).fontSize(20);
  doc.text('DIAGNÓSTICO INICIAL', x, 62, { width: ancho, align: 'center', lineBreak: false });
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

function titulo(doc: Doc, y: number, texto: string): void {
  doc.fillColor(AZUL_SECCION).font(NEGRITA).fontSize(15);
  doc.text(texto, MARGEN_X, y, { lineBreak: false });
  doc.fillColor('black');
}

function casilla(doc: Doc, x: number, y: number, marcada: boolean): void {
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

function alturaCelda(doc: Doc, c: Celda): number {
  const ancho = tw(c.ancho) - 2 * RELLENO_X - (c.casilla !== undefined ? 14 : 0);
  // "No.:" con número: el número va en un segundo renglón, porque la celda del formato es muy angosta.
  if (c.extra?.valor) return 2 * ALTO_FILA - 2;
  if (!c.texto) return ALTO_FILA;
  doc.font(c.cabecera ? NEGRITA : CUERPO).fontSize(10);
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
    let xTexto = x + RELLENO_X;
    if (c.casilla !== undefined) {
      casilla(doc, xTexto - 1, y + (ALTO_FILA - 8) / 2, c.casilla);
      xTexto += 14;
    }
    doc
      .fillColor(c.cabecera ? 'white' : 'black')
      .font(c.cabecera ? NEGRITA : CUERPO)
      .fontSize(10);
    if (c.extra) {
      // "No.:" junto a la casilla y, debajo, el número ajustado al ancho de la celda.
      const { etiqueta: rotulo, valor: numero } = c.extra;
      doc.text(rotulo, xTexto, y + RELLENO_Y, { lineBreak: false });
      if (numero) {
        const disponible = ancho - 2 * RELLENO_X;
        let tamano = 10;
        while (tamano > 6 && doc.fontSize(tamano).widthOfString(numero) > disponible) tamano -= 0.5;
        doc
          .fontSize(tamano)
          .text(numero, x + RELLENO_X, y + RELLENO_Y + 11.5, { lineBreak: false });
      }
    } else if (c.texto) {
      doc.text(c.texto, xTexto, y + RELLENO_Y, {
        width: ancho - 2 * RELLENO_X - (c.casilla !== undefined ? 14 : 0),
        align: c.centrado ? 'center' : 'left',
      });
    }
    doc.fillColor('black');
    x += ancho;
  }
  return { y, alto };
}

// Dibuja todas las filas; devuelve el borde inferior de la tabla.
function tabla(doc: Doc, y: number, filas: Celda[][], nuevaPagina: () => number): number {
  let actual = y;
  for (const celdas of filas) {
    const r = fila(doc, actual, celdas, nuevaPagina);
    actual = r.y + r.alto;
  }
  return actual;
}

const etiqueta = (texto: string, ancho: number): Celda => ({ ancho, texto });
const valor = (texto: string, ancho: number): Celda => ({ ancho, texto });

// Parte `texto` en renglones que caben en `ancho` (respeta los saltos de línea).
function renglones(doc: Doc, texto: string, ancho: number): string[] {
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

export function dibujarF0(modelo: ModeloF0): Promise<Buffer> {
  return new Promise<Buffer>((resolver, rechazar) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: INICIO_CUERPO, bottom: 45, left: MARGEN_X, right: MARGEN_X },
      info: { Title: 'Diagnóstico Inicial (F0)', Author: 'H3GA Seguros y Pensiones' },
    });
    doc.registerFont(CUERPO, join(FUENTES, 'Caladea-Regular.ttf'));
    doc.registerFont(NEGRITA, join(FUENTES, 'Caladea-Bold.ttf'));
    doc.registerFont(CURSIVA, join(FUENTES, 'Caladea-Italic.ttf'));
    const partes: Buffer[] = [];
    doc.on('data', (p: Buffer) => partes.push(p));
    doc.on('end', () => resolver(Buffer.concat(partes)));
    doc.on('error', rechazar);

    // Cada página nueva (explícita o por desbordamiento) lleva el encabezado del formato.
    doc.on('pageAdded', () => encabezado(doc));
    const nuevaPagina = (): number => {
      doc.addPage();
      return INICIO_CUERPO;
    };

    try {
      encabezado(doc);
      const g = modelo.datosGenerales;

      // ---------- 1. Datos generales ----------
      let y = INICIO_CUERPO;
      doc.fillColor(AZUL_SECCION).font(NEGRITA).fontSize(15);
      const rotulo = '1. Datos Generales del Cliente (asegurado) Fecha: ';
      doc.text(rotulo, MARGEN_X, y, { lineBreak: false });
      const xFecha = MARGEN_X + doc.widthOfString(rotulo);
      const xFin = 550;
      doc
        .lineWidth(0.6)
        .strokeColor(AZUL_SECCION)
        .moveTo(xFecha, y + 15.5)
        .lineTo(xFin, y + 15.5)
        .stroke();
      doc.fillColor('black').font(CUERPO).fontSize(11);
      doc.text(modelo.fecha, xFecha, y + 2.5, {
        width: xFin - xFecha,
        align: 'center',
        lineBreak: false,
      });

      y = tabla(
        doc,
        y + 30,
        [
          [
            { ancho: 2262, texto: 'Dato', cabecera: true, centrado: true },
            { ancho: 7702, texto: 'Información', cabecera: true, centrado: true },
          ],
          [etiqueta('Nombre completo:', 2262), valor(g.nombreCompleto, 7702)],
          [
            etiqueta('Teléfono:', 1154),
            valor(g.telefono, 3657),
            etiqueta('Correo electrónico:', 2271),
            valor(g.correo, 2882),
          ],
          [
            etiqueta('CURP:', 1144),
            valor(g.curp, 3667),
            etiqueta('INE:', 1031),
            valor(g.ine, 4122),
          ],
          [
            etiqueta('NSS principal:', 1777),
            valor(g.nss, 3034),
            etiqueta('RFC:', 1031),
            valor(g.rfc, 4122),
          ],
          [
            etiqueta('Fecha de nacimiento:', 2262),
            valor(g.fechaNacimiento, 1843),
            etiqueta('Edad:', 852),
            valor(g.edad, 1311),
            etiqueta('Ocupación:', 1382),
            valor(g.ocupacion, 2314),
          ],
          [
            etiqueta('Sexo:', 1166),
            valor(g.sexo, 3621),
            etiqueta('Estado Civil:', 2082),
            valor(g.estadoCivil, 3095),
          ],
          [
            etiqueta('Régimen IMSS (73 / 97):', 2687),
            valor(g.regimenImss, 1418),
            etiqueta('Régimen ISSSTE (Cuentas Ind / Décimo Trans.)', 4820),
            valor(g.regimenIssste, 1060),
          ],
          [
            etiqueta('AFORE actual:', 2262),
            valor(g.afore, 3099),
            etiqueta('Cambio AFORE:', 2325),
            valor(g.cambioAfore, 2278),
          ],
          [etiqueta('Domicilio:', 2262), valor(g.domicilio, 7702)],
          [
            etiqueta('Estado:', 987),
            valor(g.estado, 2693),
            etiqueta('Subdelegación IMSS probable:', 3402),
            valor(g.subdelegacion, 2882),
          ],
          [
            etiqueta('Asesor responsable:', 2262),
            valor(g.asesor, 3303),
            etiqueta('Referido por:', 1936),
            valor(g.referidoPor, 2463),
          ],
        ],
        nuevaPagina,
      );

      // ---------- 2. Documentación inicial ----------
      const d = modelo.documentos;
      y += 26;
      titulo(doc, y, '2. Documentación inicial');
      y = tabla(
        doc,
        y + 30,
        [
          [
            { ancho: 3397, texto: 'Objetivo del Cliente', cabecera: true },
            { ancho: 1277, texto: 'Seleccionar', cabecera: true },
            { ancho: 4109, cabecera: true },
            { ancho: 1277, texto: 'Seleccionar', cabecera: true },
          ],
          [
            etiqueta('Acta de Nacimiento', 3397),
            { ancho: 1277, casilla: d.acta },
            etiqueta('RFC/CSF', 4109),
            { ancho: 1277, casilla: d.rfc },
          ],
          [
            etiqueta('CURP', 3397),
            { ancho: 1277, casilla: d.curp },
            etiqueta('Comprobante de domicilio', 4109),
            { ancho: 1277, casilla: d.comprobanteDomicilio },
          ],
          [
            etiqueta('INE', 3397),
            { ancho: 1277, casilla: d.ine },
            etiqueta('Constancia de Semanas Cotizadas', 4109),
            {
              ancho: 1277,
              casilla: d.constanciaSemanas,
              extra: { etiqueta: 'No.:', valor: d.numeroConstancia },
            },
          ],
        ],
        nuevaPagina,
      );

      // ---------- 3. Diagnóstico inicial ----------
      y += 26;
      titulo(doc, y, '3. Diagnóstico Inicial');
      const opciones: [clave: string, texto: string, xCirculo: number, xTexto: number][] = [
        ['pensionarse_asap', 'Pensionarse lo antes posible', 66, 78.6],
        ['mejorar_monto_pension', 'Mejorar monto de pensión', 233.7, 245.7],
        ['negativa_pension', 'Negativa de pensión', 416, 427.9],
      ];
      const yRadios = y + 31;
      doc.font(CUERPO).fontSize(10).fillColor('black');
      for (const [clave, texto, xc, xt] of opciones) {
        doc
          .lineWidth(0.7)
          .strokeColor('black')
          .circle(xc, yRadios + 6, 3.2);
        if (modelo.objetivoCliente === clave) doc.fillAndStroke('black', 'black');
        else doc.stroke();
        doc.fillColor('black').text(texto, xt, yRadios, { lineBreak: false });
      }
      const mitad = modelo.objetivos.length / 2;
      const filasObjetivos: Celda[][] = [
        [
          { ancho: 3734, texto: 'Objetivo del Cliente', cabecera: true },
          { ancho: 1277, texto: 'Seleccionar', cabecera: true },
          { ancho: 3662, cabecera: true },
          { ancho: 1387, texto: 'Seleccionar', cabecera: true },
        ],
      ];
      for (let i = 0; i < mitad; i++) {
        const izq = modelo.objetivos[i];
        const der = modelo.objetivos[i + mitad];
        filasObjetivos.push([
          { ancho: 3734, texto: `${izq.numero}. ${izq.nombre}` },
          { ancho: 1277, casilla: izq.marcado },
          { ancho: 3662, texto: `${der.numero}. ${der.nombre}` },
          { ancho: 1387, casilla: der.marcado },
        ]);
      }
      tabla(doc, yRadios + 31, filasObjetivos, nuevaPagina);

      // ---------- 4. Correcciones y validaciones (siempre inicia página 2) ----------
      y = nuevaPagina();
      titulo(doc, y, '4. Correcciones y Validaciones');
      y = tabla(
        doc,
        y + 30,
        [
          [
            { ancho: 2122, texto: 'Trámite', cabecera: true },
            { ancho: 3969, texto: 'Observaciones', cabecera: true },
            { ancho: 3827, texto: 'Tiempo promedio', cabecera: true },
          ],
          ...modelo.correcciones.map((c): Celda[] => [
            etiqueta(c.tramite, 2122),
            valor(c.observaciones, 3969),
            valor(c.tiempo, 3827),
          ]),
        ],
        nuevaPagina,
      );

      // ---------- 5. Historial laboral ----------
      const h = modelo.historial;
      y += 26;
      titulo(doc, y, '5. Historial Laboral');
      y = tabla(
        doc,
        y + 30,
        [
          [
            { ancho: 4981, texto: 'Concepto', cabecera: true },
            { ancho: 4981, texto: 'Resultado', cabecera: true },
          ],
          [etiqueta('Semanas reconocidas IMSS', 4981), valor(h.semanasImss, 4981)],
          [etiqueta('Semanas ISSSTE', 4981), valor(h.semanasIssste, 4981)],
          [etiqueta('Salario promedio', 4981), valor(h.salarioPromedio, 4981)],
          [etiqueta('Último patrón', 4981), valor(h.ultimoPatron, 4981)],
          [etiqueta('Vigencia de derechos', 4981), valor(h.vigenciaDerechos, 4981)],
        ],
        nuevaPagina,
      );

      // ---------- 6. Observaciones generales: texto sobre renglones; crecen si hace falta ----------
      y += 26;
      titulo(doc, y, '6. Observaciones Generales');
      y += 28;
      const lineas = renglones(doc, modelo.observaciones, ANCHO);
      for (let i = 0; i < Math.max(6, lineas.length); i++) {
        if (y + 15 > LIMITE_INFERIOR) y = nuevaPagina();
        if (lineas[i])
          doc
            .font(CUERPO)
            .fontSize(10)
            .fillColor('black')
            .text(lineas[i], MARGEN_X, y, { lineBreak: false });
        doc
          .lineWidth(0.5)
          .strokeColor('black')
          .moveTo(MARGEN_X, y + 12.6)
          .lineTo(MARGEN_X + ANCHO, y + 12.6)
          .stroke();
        y += 15;
      }

      // ---------- Notas importantes ----------
      y += 16;
      if (y + 40 > LIMITE_INFERIOR) y = nuevaPagina();
      doc
        .font(CURSIVA)
        .fontSize(9)
        .fillColor('black')
        .text('NOTAS IMPORTANTES:', MARGEN_X, y, { lineBreak: false });
      doc.y = y + 18;
      for (const nota of NOTAS) {
        const yNota = doc.y;
        // Viñeta en la primera línea de la nota; se dibuja antes por si el texto pasa a otra página.
        doc.circle(MARGEN_X + 18, yNota + 4.6, 1.4).fill('black');
        doc.fillColor('black').text(nota, MARGEN_X + 36, yNota, {
          width: ANCHO - 36,
          align: 'justify',
          lineGap: 0.8,
        });
        doc.y += 4;
      }
      doc.end();
    } catch (error) {
      rechazar(error as Error);
    }
  });
}
