import { ModeloF0 } from './f0-modelo';
import {
  ANCHO,
  AZUL_SECCION,
  Celda,
  crearDocumento,
  CUERPO,
  CURSIVA,
  etiqueta,
  INICIO_CUERPO,
  LIMITE_INFERIOR,
  MARGEN_X,
  NEGRITA,
  renglones,
  tabla,
  titulo,
  valor,
} from './pdf-base';

// Dibuja el formato F0 "F0. Diagnóstico Inicial VF2" (Word) en PDF: las 6 secciones y sus tablas sobre las
// piezas comunes de pdf-base (carta, márgenes, encabezado con logo, fuente Caladea).

const NOTAS = [
  'Documento diseñado para control interno y seguimiento de clientes.',
  'Protección De Datos Personales (Aviso De Privacidad): el cliente reconoce y acepta que, para la ejecución del presente contrato, entrega a H3GA SEGUROS Y PENSIONES sus datos personales los cuales serán tratados conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP); mismos que serán utilizados exclusivamente para la asesoría técnica en materia de pensiones y jubilaciones. El cliente podrá ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición, así como revocar su consentimiento, enviando una solicitud por escrito al correo electrónico oficial: asistentehega@gmail.com. El texto completo del Aviso de Privacidad Integral, con todos sus detalles y actualizaciones, se encuentra disponible para su consulta permanente en el portal web: https://h3ga.vercel.app/.',
  'El presente formato es una herramienta de diagnóstico y planeación. Los cálculos son estimados, con base en la información y documentación proporcionada por el cliente y deben validarse con documentación oficial del IMSS, AFORE y, en su caso, con la resolución emitida por la autoridad competente. La recomendación puede cambiar si existen diferencias en semanas reconocidas, salario base, conservación de derechos, régimen aplicable, edad, topes legales, criterios administrativos o documentación del cliente.',
];

export function dibujarF0(modelo: ModeloF0): Promise<Buffer> {
  const { doc, nuevaPagina, terminado } = crearDocumento({
    titulo: 'Diagnóstico Inicial (F0)',
    subtitulo: 'DIAGNÓSTICO INICIAL',
  });
  return (async () => {
    try {
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
      doc.end();
      throw error;
    }
    return terminado;
  })();
}
