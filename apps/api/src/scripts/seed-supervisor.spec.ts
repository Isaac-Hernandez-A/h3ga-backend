import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { DOMINIO_USUARIOS, limpiarDatosClientes } from '../common/testing/datos-clientes';

// El script db/seed-supervisor.mjs se ejecuta como un proceso aparte (como lo hace pnpm db:seed:supervisor)
// contra la base de pruebas. Contraseñas y correos ficticios.
jest.setTimeout(60_000);

const RAIZ = resolve(__dirname, '../../../..');
const SCRIPT = resolve(RAIZ, 'db/seed-supervisor.mjs');
const ROL_SUPERVISOR = 3;

describeConBd('Script del Supervisor inicial (db:seed:supervisor)', () => {
  let ctx: AppConBd;
  const correo = `supervisor-${randomUUID()}${DOMINIO_USUARIOS}`;

  const ejecutar = (entorno: Record<string, string | undefined>) => {
    const r = spawnSync(process.execPath, [SCRIPT], {
      cwd: RAIZ,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, ...entorno },
    });
    return { codigo: r.status, salida: `${r.stdout}${r.stderr}` };
  };
  const entorno = (contrasena: string, extra: Record<string, string> = {}) => ({
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    SEED_SUPERVISOR_CORREO: correo,
    SEED_SUPERVISOR_CONTRASENA: contrasena,
    SEED_SUPERVISOR_NOMBRE: 'Supervisor Ficticio',
    ...extra,
  });
  const filas = () =>
    ctx.ds.query<{ rol_id: number; contrasena_hash: string; activo: boolean }[]>(
      'SELECT rol_id, contrasena_hash, activo FROM usuarios WHERE LOWER(correo_electronico) = LOWER($1)',
      [correo],
    );
  const login = async (contrasena: string) => {
    const r = await fetch(`${ctx.base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo_electronico: correo, contrasena }),
    });
    return { estado: r.status, json: (await r.json()) as { usuario?: { rol: string } } };
  };

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-75 el script crea un Supervisor que puede iniciar sesión; repetirlo no duplica; la contraseña no queda en texto plano', async () => {
    const primera = 'contrasena-ficticia-inicial-1';
    const r1 = ejecutar(entorno(primera));
    expect(r1.codigo).toBe(0);
    expect(r1.salida).not.toContain(primera);

    let usuarios = await filas();
    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].rol_id).toBe(ROL_SUPERVISOR);
    expect(usuarios[0].activo).toBe(true);
    expect(usuarios[0].contrasena_hash).toMatch(/^\$2[aby]\$10\$/);
    expect(usuarios[0].contrasena_hash).not.toContain(primera);
    const sesion = await login(primera);
    expect(sesion.estado).toBe(200);
    expect(sesion.json.usuario?.rol).toBe('supervisor');

    // Repetirlo (incluso con otra contraseña y el correo en mayúsculas) actualiza, no duplica.
    const segunda = 'contrasena-ficticia-nueva-2';
    const r2 = ejecutar(entorno(segunda, { SEED_SUPERVISOR_CORREO: correo.toUpperCase() }));
    expect(r2.codigo).toBe(0);
    expect(r2.salida).not.toContain(segunda);
    usuarios = await filas();
    expect(usuarios).toHaveLength(1);
    expect((await login(segunda)).estado).toBe(200);
    expect((await login(primera)).estado).toBe(401);
  });

  it('exige las variables obligatorias y nombra cuáles faltan sin mostrar valores', () => {
    const r = ejecutar({ DATABASE_URL: process.env.TEST_DATABASE_URL });
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('SEED_SUPERVISOR_CORREO');
    expect(r.salida).toContain('SEED_SUPERVISOR_CONTRASENA');
  });

  it('rechaza una contraseña de menos de 8 caracteres', () => {
    const corta = 'corta1';
    const r = ejecutar(entorno(corta));
    expect(r.codigo).not.toBe(0);
    expect(r.salida).not.toContain(corta);
  });

  it('se niega a correr contra una base que no sea local', () => {
    const contrasena = 'contrasena-ficticia-remota-3';
    const r = ejecutar(
      entorno(contrasena, { DATABASE_URL: 'postgresql://u:p@base-remota.invalid:5432/h3ga' }),
    );
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toMatch(/local/i);
    expect(r.salida).not.toContain(contrasena);
  });
});
