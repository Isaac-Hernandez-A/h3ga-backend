import { textosPorPagina } from '../../common/testing/texto-de-pdf';
import { ReporteOperativo } from '../reporte-operativo';
import { ReportePdfService } from './reporte-pdf.service';

// El PDF del reporte operativo se genera a partir del reporte ya calculado (no toca la base): se prueba con
// reportes de ejemplo y se lee el texto de vuelta con pdf-parse.
// Leer el texto del PDF lanza un proceso de Node: con toda la suite en paralelo puede tardar más de 5 s.
jest.setTimeout(60_000);

const ESTATUS = [
  'No aplica',
  'Por iniciar',
  'En proceso cliente',
  'En proceso asesor',
  'En proceso Instituto',
  'Finalizado',
  'Bloqueado',
  'Cancelado',
  'Detenido',
];
const NOMBRES = [
  'Diagnóstico inicial',
  'Diagnóstico especializado',
  'Corrección de datos personales',
  'Unificación de NSS',
  'Aclaración/recuperación de semanas',
];

function cartera(
  conteos: Record<number, Record<string, number>> = {},
): ReporteOperativo['cartera'] {
  return {
    estatus: ESTATUS,
    etapas: NOMBRES.map((nombre, paso) => {
      const por_estatus = Object.fromEntries(ESTATUS.map((e) => [e, conteos[paso]?.[e] ?? 0]));
      return {
        numero_paso: paso,
        nombre,
        total: Object.values(por_estatus).reduce((a, b) => a + b, 0),
        por_estatus,
      };
    }),
  };
}

const reporteConDatos = (): ReporteOperativo => ({
  periodo: 'semanal',
  desde: '2026-11-09',
  hasta: '2026-11-15',
  hoy: '2026-11-11',
  alcance: 'asesor',
  cartera: cartera({ 0: { 'Por iniciar': 3, Finalizado: 2 }, 2: { Bloqueado: 1 } }),
  finalizados: {
    total: 7,
    lista: [
      {
        cliente: 'Cliente Alfa Ficticio',
        numero_paso: 0,
        etapa: 'Diagnóstico inicial',
        fecha_completada: '2026-11-12',
      },
    ],
  },
  vencimientos: {
    vencidos: 4,
    por_vencer: 5,
    lista: [
      {
        cliente: 'Cliente Beta Ficticio',
        numero_paso: 2,
        etapa: 'Corrección de datos personales',
        fecha_compromiso: '2026-11-10',
        situacion: 'vencido',
      },
      {
        cliente: 'Cliente Gamma Ficticio',
        numero_paso: 3,
        etapa: 'Unificación de NSS',
        fecha_compromiso: '2026-11-13',
        situacion: 'por_vencer',
      },
    ],
  },
  rechazo: {
    tasa: 0.25,
    bloqueos: 2,
    etapas_con_cambios: 8,
    motivos: [
      { motivo: 'Error en el acta de nacimiento', total: 2 },
      { motivo: 'Falta comprobante', total: 1 },
    ],
  },
  clientes_nuevos: {
    total: 6,
    por_regimen: [
      { regimen: 'IMSS', total: 4 },
      { regimen: 'ISSSTE', total: 2 },
    ],
  },
  trazabilidad: {
    total: 1,
    lista: [
      {
        cliente: 'Cliente Alfa Ficticio',
        numero_paso: 2,
        etapa: 'Corrección de datos personales',
        estatus_anterior: null,
        estatus_nuevo: 'Por iniciar',
        fecha: '2026-11-10',
        asesor: 'Elena Rivas',
      },
    ],
  },
});

const reporteVacio = (): ReporteOperativo => ({
  periodo: 'mensual',
  desde: '2026-02-01',
  hasta: '2026-02-28',
  hoy: '2026-11-11',
  alcance: 'asesor',
  cartera: cartera(),
  finalizados: { total: 0, lista: [] },
  vencimientos: { vencidos: 0, por_vencer: 0, lista: [] },
  rechazo: { tasa: 0, bloqueos: 0, etapas_con_cambios: 0, motivos: [] },
  clientes_nuevos: { total: 0, por_regimen: [] },
  trazabilidad: { total: 0, lista: [] },
});

const normalizado = (paginas: string[]) => paginas.join('\n').replace(/\s+/g, ' ');

describe('ReportePdfService', () => {
  const servicio = new ReportePdfService();

  it('CP-65 el texto del PDF contiene el periodo, los totales y la tasa de rechazo del reporte', async () => {
    const pdf = await servicio.generar(reporteConDatos());
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const paginas = await textosPorPagina(pdf);
    const texto = normalizado(paginas);

    // Encabezado corporativo del formato y título del reporte.
    for (const pagina of paginas) {
      expect(pagina).toContain('CONSULTORÍA EN PENSIONES');
      expect(pagina).toContain('UNIDAD PREMIUM');
    }
    expect(texto).toContain('REPORTE OPERATIVO');
    // Periodo, referencia y alcance.
    expect(texto).toMatch(/semanal/i);
    expect(texto).toContain('09/11/2026');
    expect(texto).toContain('15/11/2026');
    expect(texto).toContain('11/11/2026');
    // Totales del resumen.
    expect(texto).toMatch(/Trámites finalizados\s+7/);
    expect(texto).toMatch(/Vencidos\s+4/);
    expect(texto).toMatch(/Por vencer\s+5/);
    expect(texto).toMatch(/Clientes nuevos\s+6/);
    // Tasa de rechazo (25 %), sus componentes y motivos.
    expect(texto).toContain('Tasa de rechazo');
    expect(texto).toContain('25.0 %');
    expect(texto).toContain('Error en el acta de nacimiento');
    // Secciones con sus datos.
    expect(texto).toContain('Cartera por etapa y estatus');
    expect(texto).toContain('Diagnóstico especializado');
    expect(texto).toContain('Cliente Alfa Ficticio');
    expect(texto).toContain('Cliente Beta Ficticio');
    expect(texto).toContain('Vencido');
    expect(texto).toContain('Por vencer');
    expect(texto).toContain('ISSSTE');
    // Sin el desglose por asesor: solo lo ve el supervisor.
    expect(texto).not.toContain('Avance promedio por asesor');
  });

  it('el supervisor recibe además el avance promedio por asesor', async () => {
    const reporte = reporteConDatos();
    reporte.alcance = 'supervisor';
    reporte.por_asesor = [
      { asesor_id: 'a1', asesor: 'Ana Ficticia', clientes: 12, avance_promedio: 37.5 },
      { asesor_id: 'a2', asesor: 'Luis Ficticio', clientes: 8, avance_promedio: 52 },
    ];
    const texto = normalizado(await textosPorPagina(await servicio.generar(reporte)));
    expect(texto).toContain('Avance promedio por asesor');
    expect(texto).toContain('Ana Ficticia');
    expect(texto).toContain('37.5 %');
    expect(texto).toContain('Luis Ficticio');
    expect(texto).toContain('52.0 %');
  });

  it('CP-66 un periodo sin datos genera el PDF sin error, con ceros', async () => {
    const pdf = await servicio.generar(reporteVacio());
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const texto = normalizado(await textosPorPagina(pdf));
    expect(texto).toMatch(/mensual/i);
    expect(texto).toContain('01/02/2026');
    expect(texto).toContain('28/02/2026');
    expect(texto).toMatch(/Trámites finalizados\s+0/);
    expect(texto).toMatch(/Vencidos\s+0/);
    expect(texto).toContain('0.0 %');
    expect(texto).toContain('Sin registros'); // las listas vacías lo dicen en lugar de dejar la tabla en blanco
    expect(texto).not.toMatch(/undefined|null|NaN/);
  });

  it('las listas largas y los motivos largos no rompen el diseño: el reporte crece a más páginas', async () => {
    const reporte = reporteConDatos();
    reporte.vencimientos.lista = Array.from({ length: 10 }, (_, i) => ({
      cliente: `Cliente Número ${i + 1} con un nombre bastante largo para forzar el ajuste de línea en la celda`,
      numero_paso: 2,
      etapa: 'Corrección de datos personales',
      fecha_compromiso: '2026-11-10',
      situacion: 'vencido' as const,
    }));
    reporte.rechazo.motivos = Array.from({ length: 5 }, (_, i) => ({
      motivo: `Motivo ${i + 1}: ${'texto muy largo '.repeat(12)}`,
      total: 5 - i,
    }));
    const paginas = await textosPorPagina(await servicio.generar(reporte));
    const texto = normalizado(paginas);
    expect(texto).toContain('Cliente Número 10');
    expect(texto).toContain('Motivo 5');
    for (const pagina of paginas) expect(pagina).toContain('CONSULTORÍA EN PENSIONES');
  });
});
