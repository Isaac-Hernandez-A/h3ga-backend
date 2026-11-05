// Zona horaria de negocio: America/Cancún (UTC-5, sin horario de verano).
export const ZONA_NEGOCIO = 'America/Cancun';

const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_NEGOCIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Fecha calendario (AAAA-MM-DD) en la zona de negocio para un instante dado.
export function fechaCancun(instante: Date = new Date()): string {
  return formato.format(instante);
}
