import { fechaCancun } from './fechas';

// Zona de negocio: America/Cancun (UTC-5, sin horario de verano).
describe('fechaCancun', () => {
  it('a las 23:30 en Cancún sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
    expect(fechaCancun(new Date('2026-11-06T04:30:00Z'))).toBe('2026-11-05');
  });

  it('a las 00:00 en Cancún ya es el día siguiente', () => {
    expect(fechaCancun(new Date('2026-11-06T05:00:00Z'))).toBe('2026-11-06');
  });

  it('en verano no hay cambio de horario (UTC-5 todo el año)', () => {
    expect(fechaCancun(new Date('2026-07-01T04:59:00Z'))).toBe('2026-06-30');
  });
});
