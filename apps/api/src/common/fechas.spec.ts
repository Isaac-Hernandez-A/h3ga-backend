import { dentroDeVentana, fechaLocal, Reloj, ZONA } from './fechas';

// Zona de negocio: America/Cancun (UTC-5, sin horario de verano).
describe('fechaLocal', () => {
  it('la zona de negocio es America/Cancun', () => {
    expect(ZONA).toBe('America/Cancun');
  });

  it('a las 23:30 en Cancún sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
    expect(fechaLocal(new Date('2026-11-06T04:30:00Z'))).toBe('2026-11-05');
  });

  it('a las 00:00 en Cancún ya es el día siguiente', () => {
    expect(fechaLocal(new Date('2026-11-06T05:00:00Z'))).toBe('2026-11-06');
  });

  it('en verano no hay cambio de horario (UTC-5 todo el año)', () => {
    expect(fechaLocal(new Date('2026-07-01T04:59:00Z'))).toBe('2026-06-30');
  });
});

describe('dentroDeVentana', () => {
  it('por defecto avisa desde 2 días antes del compromiso', () => {
    expect(dentroDeVentana('2026-11-12', '2026-11-09')).toBe(false);
    expect(dentroDeVentana('2026-11-12', '2026-11-10')).toBe(true);
    expect(dentroDeVentana('2026-11-12', '2026-11-11')).toBe(true);
    expect(dentroDeVentana('2026-11-12', '2026-11-12')).toBe(true);
  });

  it('un compromiso vencido sigue dentro de la ventana', () => {
    expect(dentroDeVentana('2026-11-12', '2026-11-20')).toBe(true);
  });

  it('respeta un número de días distinto y cruza fin de mes y de año', () => {
    expect(dentroDeVentana('2026-11-12', '2026-11-06', 5)).toBe(false);
    expect(dentroDeVentana('2026-11-12', '2026-11-07', 5)).toBe(true);
    expect(dentroDeVentana('2027-01-01', '2026-12-30')).toBe(true);
    expect(dentroDeVentana('2027-01-01', '2026-12-29')).toBe(false);
  });
});

describe('Reloj', () => {
  it('ahora() devuelve la hora actual', () => {
    const antes = Date.now();
    const ahora = new Reloj().ahora().getTime();
    expect(ahora).toBeGreaterThanOrEqual(antes);
    expect(ahora).toBeLessThanOrEqual(Date.now());
  });
});
