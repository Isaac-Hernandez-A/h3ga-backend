import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Rol } from '../common/auth/authenticated-user';
import { ROL_ID } from '../common/auth/roles-sistema';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { DOMINIO_USUARIOS, limpiarDatosClientes } from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Cambio de la contraseña propia (PATCH /auth/contrasena): flujo HTTP real contra la base de pruebas.
jest.setTimeout(60_000);

const ACTUAL = 'actual-ficticia-123';
const NUEVA = 'nueva-ficticia-456';

describeConBd('Cambio de contraseña propia (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let hashActual: string;

  async function crearUsuario(rol: Rol, activo = true) {
    const id = randomUUID();
    const correo = `${rol}-${id}${DOMINIO_USUARIOS}`;
    await ctx.ds.query(
      `INSERT INTO usuarios (id, rol_id, nombre, apellido_paterno, apellido_materno,
         correo_electronico, contrasena_hash, activo, fecha_creacion)
       VALUES ($1, $2, 'Prueba', 'Ficticio', 'Ficticio', $3, $4, $5, now())`,
      [id, ROL_ID[rol], correo, hashActual, activo],
    );
    return { id, correo };
  }

  async function pedir(ruta: string, metodo: string, token?: string, cuerpo?: unknown) {
    const r = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
    const texto = await r.text();
    return {
      estado: r.status,
      texto,
      json: (texto ? JSON.parse(texto) : {}) as Record<string, unknown>,
    };
  }
  const cambiar = (token: string | undefined, cuerpo: unknown) =>
    pedir('/auth/contrasena', 'PATCH', token, cuerpo);
  const login = (correo: string, contrasena: string) =>
    pedir('/auth/login', 'POST', undefined, { correo_electronico: correo, contrasena });
  const hashEnBd = async (id: string) =>
    (
      await ctx.ds.query<{ contrasena_hash: string }[]>(
        'SELECT contrasena_hash FROM usuarios WHERE id = $1',
        [id],
      )
    )[0].contrasena_hash;

  beforeAll(async () => {
    hashActual = await hash(ACTUAL, 4);
    ctx = await iniciarAppConBd();
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-86 cada rol cambia la suya: 204 sin cuerpo; el login funciona con la nueva y ya no con la vieja', async () => {
    for (const rol of ['asesor', 'auxiliar', 'supervisor'] as Rol[]) {
      const { id, correo } = await crearUsuario(rol);
      const r = await cambiar(tokenDe(rol, id), {
        contrasena_actual: ACTUAL,
        contrasena_nueva: NUEVA,
      });
      expect(r.estado).toBe(204);
      expect(r.texto).toBe('');
      expect((await login(correo, NUEVA)).estado).toBe(200);
      expect((await login(correo, ACTUAL)).estado).toBe(401);
    }
  });

  it('CP-87 la actual incorrecta responde 400 (no 401) con su mensaje y no cambia nada', async () => {
    const { id, correo } = await crearUsuario('asesor');
    const r = await cambiar(tokenDe('asesor', id), {
      contrasena_actual: 'otra-ficticia-999',
      contrasena_nueva: NUEVA,
    });
    expect(r.estado).toBe(400);
    expect(r.json.message).toBe('La contraseña actual es incorrecta.');
    expect(await hashEnBd(id)).toBe(hashActual);
    expect((await login(correo, ACTUAL)).estado).toBe(200);
  });

  it('CP-88 la nueva igual a la actual responde 400 y no cambia nada', async () => {
    const { id } = await crearUsuario('auxiliar');
    const r = await cambiar(tokenDe('auxiliar', id), {
      contrasena_actual: ACTUAL,
      contrasena_nueva: ACTUAL,
    });
    expect(r.estado).toBe(400);
    expect(r.json.message).toBe('La contraseña nueva debe ser distinta de la actual.');
    expect(await hashEnBd(id)).toBe(hashActual);
  });

  it('CP-89 cuerpo inválido (falta, nueva corta o larga, tipos erróneos, campos extra) responde 400', async () => {
    const { id } = await crearUsuario('supervisor');
    const token = tokenDe('supervisor', id);
    for (const cuerpo of [
      {},
      { contrasena_actual: ACTUAL },
      { contrasena_nueva: NUEVA },
      { contrasena_actual: ACTUAL, contrasena_nueva: 'corta' },
      { contrasena_actual: ACTUAL, contrasena_nueva: 'x'.repeat(73) },
      { contrasena_actual: '', contrasena_nueva: NUEVA },
      { contrasena_actual: 123, contrasena_nueva: NUEVA },
      { contrasena_actual: ACTUAL, contrasena_nueva: NUEVA, rol_id: 3 },
    ]) {
      expect((await cambiar(token, cuerpo)).estado).toBe(400);
    }
    expect(await hashEnBd(id)).toBe(hashActual);
  });

  it('CP-90 sin token responde 401; la nueva de 72 caracteres es válida', async () => {
    const sinToken = await cambiar(undefined, {
      contrasena_actual: ACTUAL,
      contrasena_nueva: NUEVA,
    });
    expect(sinToken.estado).toBe(401);
    const { id, correo } = await crearUsuario('asesor');
    const limite = 'y'.repeat(72);
    const r = await cambiar(tokenDe('asesor', id), {
      contrasena_actual: ACTUAL,
      contrasena_nueva: limite,
    });
    expect(r.estado).toBe(204);
    expect((await login(correo, limite)).estado).toBe(200);
  });

  it('CP-91 un usuario inactivo o inexistente no puede cambiarla (401) y no se modifica nada', async () => {
    const inactivo = await crearUsuario('asesor', false);
    const cuerpo = { contrasena_actual: ACTUAL, contrasena_nueva: NUEVA };
    expect((await cambiar(tokenDe('asesor', inactivo.id), cuerpo)).estado).toBe(401);
    expect(await hashEnBd(inactivo.id)).toBe(hashActual);
    expect((await cambiar(tokenDe('asesor', randomUUID()), cuerpo)).estado).toBe(401);
  });

  it('CP-92 ninguna respuesta incluye contrasena_hash ni el hash', async () => {
    const { id } = await crearUsuario('asesor');
    const token = tokenDe('asesor', id);
    for (const cuerpo of [
      { contrasena_actual: 'mala-ficticia-1', contrasena_nueva: NUEVA },
      { contrasena_actual: ACTUAL, contrasena_nueva: ACTUAL },
      {},
      { contrasena_actual: ACTUAL, contrasena_nueva: NUEVA },
    ]) {
      const r = await cambiar(token, cuerpo);
      expect(r.texto).not.toContain('contrasena_hash');
      expect(r.texto).not.toContain(hashActual);
    }
  });
});
