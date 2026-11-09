import { Injectable } from '@nestjs/common';
import { ReporteOperativo } from '../reporte-operativo';
import { formatoFecha } from './f0-modelo';
import {
  ALTO_FILA,
  Celda,
  crearDocumento,
  CURSIVA,
  Doc,
  INICIO_CUERPO,
  LIMITE_INFERIOR,
  MARGEN_X,
  ANCHO,
  tabla,
  titulo,
} from './pdf-base';

// Encabezados cortos de la matriz de cartera (la columna es angosta).
const ESTATUS_CORTO: Record<string, string> = {
  'En proceso cliente': 'En proc. cliente',
  'En proceso asesor': 'En proc. asesor',
  'En proceso Instituto': 'En proc. Instituto',
};

const ANCHO_TOTAL = 9972; // twips: el ancho útil de la página
const porcentaje = (fraccion: number): string => `${(fraccion * 100).toFixed(1)} %`;
const encabezados = (...textos: [string, number][]): Celda[] =>
  textos.map(([texto, ancho]) => ({ ancho, texto, cabecera: true }));
const sinRegistros = (): Celda[] => [{ ancho: ANCHO_TOTAL, texto: 'Sin registros' }];

// Genera el PDF del reporte operativo con el diseño corporativo del F0 (encabezado con logo, fuente Caladea,
// tablas con cabecera azul). Recibe el reporte ya calculado: lo que se imprime es exactamente lo que devuelve
// GET /reportes (mismo alcance y mismos números).
@Injectable()
export class ReportePdfService {
  generar(reporte: ReporteOperativo): Promise<Buffer> {
    const { doc, nuevaPagina, terminado } = crearDocumento({
      titulo: `Reporte operativo ${reporte.periodo}`,
      subtitulo: 'REPORTE OPERATIVO',
    });
    try {
      let y = INICIO_CUERPO;
      // Un bloque (título y tabla) no se queda huérfano al final de una página.
      const bloque = (rotulo: string, filas: Celda[][]): void => {
        if (y + 30 + 3 * ALTO_FILA > LIMITE_INFERIOR) y = nuevaPagina();
        titulo(doc, y, rotulo);
        y = tabla(doc, y + 30, filas, nuevaPagina) + 26;
      };

      const semanal = reporte.periodo === 'semanal';
      bloque(`Reporte operativo ${semanal ? 'semanal' : 'mensual'}`, [
        encabezados(['Dato', 2262], ['Información', 7710]),
        [
          { ancho: 2262, texto: 'Tipo de reporte' },
          {
            ancho: 7710,
            texto: semanal ? 'Semanal (lunes a domingo)' : 'Mensual (mes calendario)',
          },
        ],
        [
          { ancho: 2262, texto: 'Periodo' },
          {
            ancho: 7710,
            texto: `${formatoFecha(reporte.desde)} al ${formatoFecha(reporte.hasta)}`,
          },
        ],
        [
          { ancho: 2262, texto: 'Generado el' },
          { ancho: 7710, texto: formatoFecha(reporte.hoy) },
        ],
        [
          { ancho: 2262, texto: 'Alcance' },
          {
            ancho: 7710,
            texto:
              reporte.alcance === 'supervisor'
                ? 'Supervisor: todos los clientes'
                : 'Asesor: solo sus clientes',
          },
        ],
      ]);

      // ---------- 1. Resumen ----------
      const enCartera = reporte.cartera.etapas.reduce((suma, e) => suma + e.total, 0);
      const resumen: [string, string][] = [
        ['Etapas en cartera (etapas 0 a 4)', String(enCartera)],
        ['Trámites finalizados', String(reporte.finalizados.total)],
        ['Vencidos', String(reporte.vencimientos.vencidos)],
        ['Por vencer', String(reporte.vencimientos.por_vencer)],
        ['Tasa de rechazo', porcentaje(reporte.rechazo.tasa)],
        ['Clientes nuevos', String(reporte.clientes_nuevos.total)],
      ];
      bloque('1. Resumen', [
        encabezados(['Concepto', 6000], ['Resultado', 3972]),
        ...resumen.map(([concepto, resultado]): Celda[] => [
          { ancho: 6000, texto: concepto },
          { ancho: 3972, texto: resultado, negrita: true },
        ]),
      ]);

      // ---------- 2. Cartera por etapa y estatus ----------
      const estatus = reporte.cartera.estatus;
      const anchoEtapa = 2000;
      const anchoEstatus = 740;
      const anchoTotal = ANCHO_TOTAL - anchoEtapa - anchoEstatus * estatus.length;
      bloque('2. Cartera por etapa y estatus', [
        [
          { ancho: anchoEtapa, texto: 'Etapa', cabecera: true },
          ...estatus.map((e): Celda => ({
            ancho: anchoEstatus,
            texto: ESTATUS_CORTO[e] ?? e,
            cabecera: true,
            centrado: true,
            tamano: 7,
            relleno: 1.5,
          })),
          { ancho: anchoTotal, texto: 'Total', cabecera: true, centrado: true },
        ],
        ...reporte.cartera.etapas.map((etapa): Celda[] => [
          { ancho: anchoEtapa, texto: `${etapa.numero_paso}. ${etapa.nombre}` },
          ...estatus.map((e): Celda => ({
            ancho: anchoEstatus,
            texto: String(etapa.por_estatus[e] ?? 0),
            centrado: true,
            relleno: 1.5,
          })),
          { ancho: anchoTotal, texto: String(etapa.total), centrado: true, negrita: true },
        ]),
      ]);

      // ---------- 3. Trámites finalizados ----------
      const f = reporte.finalizados;
      const recortadaF = f.total > f.lista.length;
      bloque(`3. Trámites finalizados en el periodo (${f.total})`, [
        encabezados(['Cliente', 4400], ['Etapa', 3772], ['Fecha de término', 1800]),
        ...(f.lista.length === 0
          ? [sinRegistros()]
          : f.lista.map((x): Celda[] => [
              { ancho: 4400, texto: x.cliente },
              { ancho: 3772, texto: `${x.numero_paso}. ${x.etapa}` },
              { ancho: 1800, texto: formatoFecha(x.fecha_completada) },
            ])),
        ...(recortadaF
          ? [
              [
                {
                  ancho: ANCHO_TOTAL,
                  texto: `Se muestran los ${f.lista.length} más recientes de ${f.total}.`,
                },
              ],
            ]
          : []),
      ]);

      // ---------- 4. Vencidos y por vencer ----------
      const v = reporte.vencimientos;
      const recortadaV = v.vencidos + v.por_vencer > v.lista.length;
      bloque(`4. Vencidos (${v.vencidos}) y por vencer (${v.por_vencer})`, [
        encabezados(
          ['Cliente', 3700],
          ['Etapa', 3000],
          ['Fecha compromiso', 1672],
          ['Situación', 1600],
        ),
        ...(v.lista.length === 0
          ? [sinRegistros()]
          : v.lista.map((x): Celda[] => [
              { ancho: 3700, texto: x.cliente },
              { ancho: 3000, texto: `${x.numero_paso}. ${x.etapa}` },
              { ancho: 1672, texto: formatoFecha(x.fecha_compromiso) },
              { ancho: 1600, texto: x.situacion === 'vencido' ? 'Vencido' : 'Por vencer' },
            ])),
        ...(recortadaV
          ? [
              [
                {
                  ancho: ANCHO_TOTAL,
                  texto: `Se muestran las ${v.lista.length} más atrasadas o próximas.`,
                },
              ],
            ]
          : []),
      ]);

      // ---------- 5. Tasa de rechazo ----------
      const r = reporte.rechazo;
      bloque('5. Tasa de rechazo', [
        encabezados(['Concepto', 7500], ['Resultado', 2472]),
        [
          { ancho: 7500, texto: 'Tasa de rechazo (bloqueos con motivo / etapas con cambios)' },
          { ancho: 2472, texto: porcentaje(r.tasa), negrita: true },
        ],
        [
          { ancho: 7500, texto: 'Bloqueos con motivo en el periodo' },
          { ancho: 2472, texto: String(r.bloqueos) },
        ],
        [
          { ancho: 7500, texto: 'Etapas con algún cambio de estatus en el periodo' },
          { ancho: 2472, texto: String(r.etapas_con_cambios) },
        ],
        encabezados(['Motivos más frecuentes', 7500], ['Veces', 2472]),
        ...(r.motivos.length === 0
          ? [sinRegistros()]
          : r.motivos.map((m): Celda[] => [
              { ancho: 7500, texto: m.motivo },
              { ancho: 2472, texto: String(m.total) },
            ])),
      ]);

      // ---------- 6. Clientes nuevos y distribución por régimen ----------
      const n = reporte.clientes_nuevos;
      bloque(`6. Clientes nuevos y distribución por régimen (${n.total})`, [
        encabezados(['Régimen', 7500], ['Clientes nuevos', 2472]),
        ...(n.por_regimen.length === 0
          ? [sinRegistros()]
          : n.por_regimen.map((x): Celda[] => [
              { ancho: 7500, texto: x.regimen },
              { ancho: 2472, texto: String(x.total) },
            ])),
      ]);

      // ---------- 7. Avance por asesor (solo supervisor) ----------
      if (reporte.por_asesor) {
        bloque('7. Avance promedio por asesor', [
          encabezados(['Asesor', 5500], ['Clientes', 2000], ['Avance promedio', 2472]),
          ...(reporte.por_asesor.length === 0
            ? [sinRegistros()]
            : reporte.por_asesor.map((a): Celda[] => [
                { ancho: 5500, texto: a.asesor },
                { ancho: 2000, texto: String(a.clientes) },
                { ancho: 2472, texto: `${a.avance_promedio.toFixed(1)} %` },
              ])),
        ]);
      }

      notas(doc, y, nuevaPagina);
      doc.end();
    } catch (error) {
      doc.end();
      return Promise.reject(error as Error);
    }
    return terminado;
  }
}

const NOTAS = [
  'El reporte cubre las etapas 0 a 4 (F0 a F4) de los clientes del alcance indicado. Los cálculos son estimados con la información registrada en la plataforma.',
  'Vencida: fecha compromiso anterior a hoy. Por vencer: de hoy a 2 días. No se cuentan las etapas Finalizado, Cancelado ni No aplica. Las fechas y horas son de la zona America/Cancún.',
];

function notas(doc: Doc, y: number, nuevaPagina: () => number): void {
  if (y + 60 > LIMITE_INFERIOR) y = nuevaPagina();
  doc
    .font(CURSIVA)
    .fontSize(9)
    .fillColor('black')
    .text('NOTAS:', MARGEN_X, y, { lineBreak: false });
  doc.y = y + 16;
  for (const nota of NOTAS) {
    const yNota = doc.y;
    doc.circle(MARGEN_X + 18, yNota + 4.6, 1.4).fill('black');
    doc.fillColor('black').text(nota, MARGEN_X + 36, yNota, {
      width: ANCHO - 36,
      align: 'justify',
      lineGap: 0.8,
    });
    doc.y += 4;
  }
}
