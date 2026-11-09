import { Injectable } from '@nestjs/common';

// Zona horaria de negocio: America/Cancún (UTC-5, sin horario de verano).
export const ZONA = 'America/Cancun';

// Días antes del compromiso en que empieza a avisarse (regla confirmada: fecha_compromiso − 2 días).
export const DIAS_ANTES_AVISO = 2;

const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Fecha calendario (AAAA-MM-DD) en la zona de negocio para un instante dado.
export function fechaLocal(ahora: Date): string {
  return formato.format(ahora);
}

function restarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d - dias)).toISOString().slice(0, 10);
}

// ¿Ya corresponde avisar? Verdadero desde `diasAntes` días antes del compromiso (inclusive) y también
// cuando ya venció. Ambas fechas son AAAA-MM-DD de Cancún.
export function dentroDeVentana(
  fechaCompromiso: string,
  hoy: string,
  diasAntes: number = DIAS_ANTES_AVISO,
): boolean {
  return hoy >= restarDias(fechaCompromiso, diasAntes);
}

// Fuente de la hora actual. Se inyecta para poder fijar la hora en las pruebas.
@Injectable()
export class Reloj {
  ahora(): Date {
    return new Date();
  }
}

export type PeriodoReporte = 'semanal' | 'mensual';

// Convierte AAAA-MM-DD en milisegundos UTC; lanza si no es una fecha real del calendario.
function aUtc(fecha: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const instante = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  if (Number.isNaN(instante) || new Date(instante).toISOString().slice(0, 10) !== fecha) {
    throw new Error(`Fecha inválida: "${fecha}" (se espera AAAA-MM-DD).`);
  }
  return instante;
}

const aTexto = (instante: number): string => new Date(instante).toISOString().slice(0, 10);
const DIA_MS = 24 * 60 * 60 * 1000;

// Suma (o resta, si es negativo) días a una fecha AAAA-MM-DD.
export function sumarDias(fecha: string, dias: number): string {
  return aTexto(aUtc(fecha) + dias * DIA_MS);
}

// Periodo que contiene a `fecha` (AAAA-MM-DD de Cancún): semana de lunes a domingo o mes calendario.
export function rangoDePeriodo(
  periodo: PeriodoReporte,
  fecha: string,
): { desde: string; hasta: string } {
  const dia = aUtc(fecha);
  if (periodo === 'semanal') {
    const desdeSemana = dia - ((new Date(dia).getUTCDay() + 6) % 7) * DIA_MS; // getUTCDay: 0 = domingo
    return { desde: aTexto(desdeSemana), hasta: aTexto(desdeSemana + 6 * DIA_MS) };
  }
  const f = new Date(dia);
  return {
    desde: aTexto(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 1)),
    hasta: aTexto(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0)),
  };
}
