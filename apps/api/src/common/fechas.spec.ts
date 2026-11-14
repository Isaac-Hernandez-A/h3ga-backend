import { dentroDeVentana, fechaLocal, rangoDePeriodo, Reloj, ZONA } from './fechas';

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

describe('rangoDePeriodo', () => {
  it('CP-56 semana de lunes a domingo y mes calendario en Cancún; domingo 23:30 pertenece a esa semana, lunes 00:00 a la siguiente', () => {
    // Semana (lunes a domingo) de cualquier día de ella.
    for (const dia of ['2026-11-09', '2026-11-11', '2026-11-15']) {
      expect(rangoDePeriodo('semanal', dia)).toEqual({ desde: '2026-11-09', hasta: '2026-11-15' });
    }
    // Semana que cruza el fin de año.
    expect(rangoDePeriodo('semanal', '2026-12-31')).toEqual({
      desde: '2026-12-28',
      hasta: '2027-01-03',
    });
    // Mes calendario, con febrero bisiesto y diciembre.
    expect(rangoDePeriodo('mensual', '2026-11-11')).toEqual({
      desde: '2026-11-01',
      hasta: '2026-11-30',
    });
    expect(rangoDePeriodo('mensual', '2028-02-10')).toEqual({
      desde: '2028-02-01',
      hasta: '2028-02-29',
    });
    expect(rangoDePeriodo('mensual', '2026-12-31')).toEqual({
      desde: '2026-12-01',
      hasta: '2026-12-31',
    });

    // Borde de zona: domingo 8 de noviembre, 23:30 en Cancún (04:30 UTC del lunes) sigue en esa semana...
    const domingoNoche = fechaLocal(new Date('2026-11-09T04:30:00Z'));
    expect(rangoDePeriodo('semanal', domingoNoche)).toEqual({
      desde: '2026-11-02',
      hasta: '2026-11-08',
    });
    // ...y el lunes 9 a las 00:00 de Cancún (05:00 UTC) ya es la siguiente.
    const lunesMadrugada = fechaLocal(new Date('2026-11-09T05:00:00Z'));
    expect(rangoDePeriodo('semanal', lunesMadrugada)).toEqual({
      desde: '2026-11-09',
      hasta: '2026-11-15',
    });
  });

  it('rechaza una fecha que no existe en el calendario', () => {
    expect(() => rangoDePeriodo('semanal', '2026-02-30')).toThrow();
    expect(() => rangoDePeriodo('mensual', 'no-es-fecha')).toThrow();
  });
});
