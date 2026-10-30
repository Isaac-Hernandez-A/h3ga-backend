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

  it('en desarrollo no exige JWT_SECRET', () => {
    expect(() => validarEntorno({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => validarEntorno({})).not.toThrow();
  });
});
