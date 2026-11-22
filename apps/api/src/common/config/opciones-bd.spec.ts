import { opcionesBd } from './opciones-bd';

// Opciones de TypeORM: la regla 1 de CLAUDE.md (nunca synchronize ni migraciones automáticas) se conserva
// con o sin TLS. Datos ficticios.
const URL = 'postgresql://usuario:clave@localhost:5432/bd_ficticia';

describe('opcionesBd', () => {
  it('CP-358 sin DATABASE_SSL no agrega ssl y deja la URL tal cual (local)', () => {
    const o = opcionesBd({ DATABASE_URL: URL });
    expect(o.url).toBe(URL);
    expect(o.ssl).toBeUndefined();
    expect(o).toMatchObject({ type: 'postgres', synchronize: false, migrationsRun: false });
  });

  it('CP-358 con DATABASE_SSL=true agrega ssl, quita sslmode de la URL y sigue sin synchronize', () => {
    const o = opcionesBd({ DATABASE_URL: `${URL}?sslmode=require`, DATABASE_SSL: 'true' });
    expect(o.ssl).toEqual({ rejectUnauthorized: true });
    expect(o.url).toBe(URL);
    expect(o).toMatchObject({ synchronize: false, migrationsRun: false });
  });

  it('CP-358 sin DATABASE_URL falla nombrando la variable', () => {
    expect(() => opcionesBd({})).toThrow(/DATABASE_URL/);
  });
});
