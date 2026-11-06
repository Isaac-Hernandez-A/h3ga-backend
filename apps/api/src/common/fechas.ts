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
