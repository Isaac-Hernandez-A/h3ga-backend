import { JWT_SECRET_EJEMPLO, validarEntorno } from './validar-entorno';

describe('validarEntorno', () => {
  const secreto = 'valor-ficticio-solo-para-pruebas';

  it('en producción se niega a arrancar si JWT_SECRET falta', () => {
    expect(() => validarEntorno({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });

  it('en producción se niega a arrancar si JWT_SECRET está vacío', () => {
    expect(() => validarEntorno({ NODE_ENV: 'production', JWT_SECRET: '  ' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('en producción se niega a arrancar si JWT_SECRET es el valor de ejemplo', () => {
    expect(() =>
      validarEntorno({ NODE_ENV: 'production', JWT_SECRET: JWT_SECRET_EJEMPLO }),
    ).toThrow(/JWT_SECRET/);
  });

  it('en producción arranca con un JWT_SECRET propio', () => {
    expect(() => validarEntorno({ NODE_ENV: 'production', JWT_SECRET: secreto })).not.toThrow();
  });

  it('rechaza CORS_ORIGINS con comodín o entradas vacías, y acepta una lista válida', () => {
    expect(() => validarEntorno({ CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
    expect(() =>
      validarEntorno({ CORS_ORIGINS: 'http://localhost:3000,,http://x.invalid' }),
    ).toThrow(/CORS_ORIGINS/);
    expect(() =>
      validarEntorno({ CORS_ORIGINS: 'http://localhost:3000, http://127.0.0.1:3000' }),
    ).not.toThrow();
    expect(() => validarEntorno({})).not.toThrow();
  });

  it('en desarrollo no exige JWT_SECRET', () => {
    expect(() => validarEntorno({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => validarEntorno({})).not.toThrow();
  });
});

describe('validarEntorno: almacenamiento de documentos', () => {
  const spaces = {
    SPACES_KEY: 'llave-ficticia',
    SPACES_SECRET: 'secreto-ficticio',
    SPACES_REGION: 'nyc3',
    SPACES_ENDPOINT: 'https://nyc3.example.invalid',
    SPACES_BUCKET: 'bucket-ficticio',
  };

  it('sin STORAGE_DRIVER o con local no exige variables de Spaces', () => {
    expect(() => validarEntorno({})).not.toThrow();
    expect(() => validarEntorno({ STORAGE_DRIVER: 'local' })).not.toThrow();
  });

  it('un STORAGE_DRIVER desconocido no arranca', () => {
    expect(() => validarEntorno({ STORAGE_DRIVER: 's3' })).toThrow(/STORAGE_DRIVER/);
  });

  it('con spaces exige las cinco variables SPACES_* y nombra cuáles faltan sin mostrar valores', () => {
    expect(() => validarEntorno({ STORAGE_DRIVER: 'spaces', ...spaces })).not.toThrow();
    const incompleto = { ...spaces, SPACES_SECRET: undefined };
    expect(() => validarEntorno({ STORAGE_DRIVER: 'spaces', ...incompleto })).toThrow(
      /SPACES_SECRET/,
    );
    try {
      validarEntorno({ STORAGE_DRIVER: 'spaces', ...incompleto });
    } catch (error) {
      expect((error as Error).message).not.toContain('llave-ficticia');
    }
  });
});
