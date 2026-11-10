import { compare } from 'bcryptjs';
import { BcryptPasswordHasher } from './password-hasher';

// Contraseña ficticia solo para pruebas.
const CONTRASENA = 'contrasena-ficticia-123';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('genera un hash bcrypt de costo 10, distinto del texto original', async () => {
    const hash = await hasher.hash(CONTRASENA);
    expect(hash).not.toBe(CONTRASENA);
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    expect(await compare(CONTRASENA, hash)).toBe(true);
  });

  it('usa una sal aleatoria: dos hashes de la misma contraseña son distintos', async () => {
    expect(await hasher.hash(CONTRASENA)).not.toBe(await hasher.hash(CONTRASENA));
  });

  it('una contraseña distinta no verifica contra el hash', async () => {
    const hash = await hasher.hash(CONTRASENA);
    expect(await compare('otra-contrasena-456', hash)).toBe(false);
  });

  it('verify acepta la contraseña correcta y rechaza una distinta', async () => {
    const hash = await hasher.hash(CONTRASENA);
    expect(await hasher.verify(CONTRASENA, hash)).toBe(true);
    expect(await hasher.verify('otra-contrasena-456', hash)).toBe(false);
  });
});
