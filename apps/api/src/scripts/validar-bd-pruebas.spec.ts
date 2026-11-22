import { describirDestino, validarBdPruebas } from './validar-bd-pruebas';

// pnpm pruebas:datos solo corre contra una base local cuyo nombre termina en _test. Para una base de staging
// (remota, con otro nombre) hace falta el flag explícito --permitir-staging. Valores ficticios.
const LOCAL_TEST = 'postgresql://usuario:clave-ficticia@localhost:5432/h3ga_test';
const STAGING = 'postgresql://usuario:clave-ficticia@staging-bd.ejemplo.test:25060/h3ga_staging';
const REMOTA_TEST = 'postgresql://usuario:clave-ficticia@staging-bd.ejemplo.test:25060/h3ga_test';
const LOCAL_OTRO_NOMBRE = 'postgresql://usuario:clave-ficticia@localhost:5432/h3ga';

describe('validarBdPruebas', () => {
  it('CP-364 sin flag acepta una base local *_test', () => {
    expect(validarBdPruebas(LOCAL_TEST, {})).toBe(LOCAL_TEST);
  });

  it.each([
    ['una base remota', STAGING],
    ['una base remota aunque termine en _test', REMOTA_TEST],
    ['una base local que no termina en _test', LOCAL_OTRO_NOMBRE],
  ])('CP-365 sin flag rechaza %s', (_n, url) => {
    expect(() => validarBdPruebas(url, {})).toThrow();
    expect(() => validarBdPruebas(url, { permitirStaging: false })).toThrow();
  });

  it.each([
    ['la remota de staging', STAGING],
    ['la local con otro nombre', LOCAL_OTRO_NOMBRE],
  ])('CP-366 con --permitir-staging acepta %s', (_n, url) => {
    expect(validarBdPruebas(url, { permitirStaging: true })).toBe(url);
  });

  it('CP-367 falta de URL o URL inválida siguen fallando, también con el flag', () => {
    expect(() => validarBdPruebas(undefined, { permitirStaging: true })).toThrow(
      /TEST_DATABASE_URL/,
    );
    expect(() => validarBdPruebas('no es una url', { permitirStaging: true })).toThrow();
    expect(() =>
      validarBdPruebas('postgresql://u:p@host.ejemplo.test:5432/', { permitirStaging: true }),
    ).toThrow();
  });

  it('CP-368 los mensajes de error no incluyen la contraseña ni la URL', () => {
    for (const url of [STAGING, LOCAL_OTRO_NOMBRE]) {
      const error = (() => {
        try {
          validarBdPruebas(url, {});
        } catch (e) {
          return e as Error;
        }
      })();
      expect(error?.message).not.toContain('clave-ficticia');
      expect(error?.message).not.toContain('usuario');
    }
  });
});

describe('describirDestino', () => {
  it('CP-369 dice servidor y base, sin usuario ni contraseña', () => {
    const texto = describirDestino(STAGING);
    expect(texto).toContain('staging-bd.ejemplo.test');
    expect(texto).toContain('h3ga_staging');
    expect(texto).not.toContain('clave-ficticia');
    expect(texto).not.toContain('usuario');
  });
});
