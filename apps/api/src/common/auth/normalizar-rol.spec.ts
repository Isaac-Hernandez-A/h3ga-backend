import { normalizarRol } from './normalizar-rol';

describe('normalizarRol', () => {
  it.each(['asesor', 'auxiliar', 'supervisor'])('acepta "%s"', (rol) => {
    expect(normalizarRol(rol)).toBe(rol);
  });

  it.each([['Asesor'], ['admin'], [''], [undefined], [null], [42], [{}]])('rechaza %p', (valor) => {
    expect(normalizarRol(valor)).toBeNull();
  });
});
