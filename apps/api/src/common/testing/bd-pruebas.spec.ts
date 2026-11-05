import { validarUrlBdPruebas } from './bd-pruebas';

describe('validarUrlBdPruebas (la base de pruebas nunca es la de desarrollo)', () => {
  it('acepta una base local cuyo nombre termina en _test', () => {
    const url = 'postgresql://usuario:clave@localhost:5432/h3ga_test';
    expect(validarUrlBdPruebas(url)).toBe(url);
  });

  it.each([
    ['la de desarrollo', 'postgresql://u:c@localhost:5432/h3ga_dev'],
    ['sin sufijo _test', 'postgresql://u:c@localhost:5432/h3ga'],
    ['con mayúsculas', 'postgresql://u:c@localhost:5432/H3GA_test'],
  ])('rechaza una base %s', (_caso, url) => {
    expect(() => validarUrlBdPruebas(url)).toThrow(/_test/);
  });

  it('rechaza un host que no es local', () => {
    expect(() => validarUrlBdPruebas('postgresql://u:c@db.ejemplo.com:5432/h3ga_test')).toThrow(
      /local/,
    );
  });
});
