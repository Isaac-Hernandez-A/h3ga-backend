import { AvanceInvalidoError, calcularAvance, esReactivacion } from './reglas-avance';

// Reglas de avance (RF-18): funciones puras, sin base de datos.
describe('calcularAvance', () => {
  it('CP-22 Por iniciar 10; Finalizado 100; En proceso 55 queda 55; En proceso 15 o 95 lanza error; Bloqueado conserva 40', () => {
    expect(calcularAvance({ estatusNuevo: 'Por iniciar', avancePrevio: 0 })).toBe(10);
    expect(calcularAvance({ estatusNuevo: 'Finalizado', avancePrevio: 40 })).toBe(100);
    expect(
      calcularAvance({ estatusNuevo: 'En proceso asesor', avancePrevio: 10, avanceSolicitado: 55 }),
    ).toBe(55);
    for (const malo of [15, 95]) {
      expect(() =>
        calcularAvance({
          estatusNuevo: 'En proceso cliente',
          avancePrevio: 10,
          avanceSolicitado: malo,
        }),
      ).toThrow(AvanceInvalidoError);
    }
    expect(calcularAvance({ estatusNuevo: 'Bloqueado', avancePrevio: 40 })).toBe(40);
  });

  it('los límites 20 y 90 son válidos para los tres En proceso', () => {
    for (const estatusNuevo of [
      'En proceso cliente',
      'En proceso asesor',
      'En proceso Instituto',
    ] as const) {
      expect(calcularAvance({ estatusNuevo, avancePrevio: 10, avanceSolicitado: 20 })).toBe(20);
      expect(calcularAvance({ estatusNuevo, avancePrevio: 10, avanceSolicitado: 90 })).toBe(90);
    }
  });

  it('Cancelado, Detenido y No aplica conservan el avance previo', () => {
    for (const estatusNuevo of ['Cancelado', 'Detenido', 'No aplica'] as const) {
      expect(calcularAvance({ estatusNuevo, avancePrevio: 33 })).toBe(33);
    }
  });

  it('los estatus de avance fijo o congelado ignoran el avance solicitado', () => {
    expect(
      calcularAvance({ estatusNuevo: 'Por iniciar', avancePrevio: 0, avanceSolicitado: 77 }),
    ).toBe(10);
    expect(
      calcularAvance({ estatusNuevo: 'Bloqueado', avancePrevio: 40, avanceSolicitado: 77 }),
    ).toBe(40);
  });

  it('En proceso sin avance solicitado conserva el previo si está entre 20 y 90 (reactivación desde congelado)', () => {
    expect(calcularAvance({ estatusNuevo: 'En proceso asesor', avancePrevio: 40 })).toBe(40);
  });

  it('En proceso sin avance solicitado y con previo fuera de rango lanza error', () => {
    expect(() => calcularAvance({ estatusNuevo: 'En proceso asesor', avancePrevio: 10 })).toThrow(
      AvanceInvalidoError,
    );
  });

  it('un avance no entero lanza error', () => {
    expect(() =>
      calcularAvance({
        estatusNuevo: 'En proceso asesor',
        avancePrevio: 10,
        avanceSolicitado: 50.5,
      }),
    ).toThrow(AvanceInvalidoError);
  });
});

describe('esReactivacion', () => {
  it('es reactivación al pasar de Bloqueado, Cancelado o Detenido a un estatus activo', () => {
    expect(esReactivacion('Bloqueado', 'En proceso asesor')).toBe(true);
    expect(esReactivacion('Cancelado', 'Por iniciar')).toBe(true);
    expect(esReactivacion('Detenido', 'Finalizado')).toBe(true);
  });

  it('no lo es entre excepciones, hacia No aplica ni desde un estatus activo', () => {
    expect(esReactivacion('Bloqueado', 'Cancelado')).toBe(false);
    expect(esReactivacion('Bloqueado', 'No aplica')).toBe(false);
    expect(esReactivacion('En proceso asesor', 'Bloqueado')).toBe(false);
    expect(esReactivacion('Por iniciar', 'En proceso cliente')).toBe(false);
  });
});
