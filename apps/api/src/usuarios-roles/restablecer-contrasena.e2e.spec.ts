import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { ROL_ID } from '../common/auth/roles-sistema';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { tokenDe } from '../common/testing/tokens';

// Restablecer la contraseña de otro usuario (PATCH /usuarios/:usuarioId/contrasena): flujo HTTP real.
jest.setTimeout(60_000);

const VIEJA = 'vieja-ficticia-123';
const NUEVA = 'nueva-ficticia-456';

describeConBd('Restablecer contraseña de un usuario (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let hashViejo: string;
  const supervisor = tokenDe('supervisor');

  async function crearUsuario(rolId: number = ROL_ID.asesor, activo = true) {
    const id = randomUUID();
    const correo = `restablecer-${id}@ejemplo.invalid`;
    await ctx.ds.query(
      `INSERT INTO usuarios (id, rol_id, nombre, apellido_paterno, apellido_materno,
         correo_electronico, contrasena_hash, activo, fecha_creacion)
       VALUES ($1, $2, 'Prueba', 'Ficticio', 'Ficticio', $3, $4, $5, now())`,
      [id, rolId, correo, hashViejo, activo],
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
  const restablecer = (id: string, token: string | undefined, cuerpo?: unknown) =>
    pedir(`/usuarios/${id}/contrasena`, 'PATCH', token, cuerpo);
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
    hashViejo = await hash(VIEJA, 4);
    ctx = await iniciarAppConBd();
  });

  afterAll(async () => {
    if (!ctx) return;
    await ctx.ds.query(
      "DELETE FROM usuarios WHERE correo_electronico LIKE 'restablecer-%@ejemplo.invalid'",
    );
    await ctx.app.close();
  });

  it('CP-82 el supervisor restablece la de un asesor: 204 sin cuerpo; entra con la nueva y ya no con la vieja', async () => {
    const { id, correo } = await crearUsuario();
    const r = await restablecer(id, supervisor, { contrasena: NUEVA });
    expect(r.estado).toBe(204);
    expect(r.texto).toBe('');
    expect((await login(correo, NUEVA)).estado).toBe(200);
    expect((await login(correo, VIEJA)).estado).toBe(401);
    const guardado = await hashEnBd(id);
    expect(guardado.startsWith('$2')).toBe(true);
    expect(guardado).not.toBe(NUEVA);
  });

  it('CP-82 funciona también sobre un usuario inactivo (sigue inactivo y no puede entrar)', async () => {
    const { id, correo } = await crearUsuario(ROL_ID.auxiliar, false);
    expect((await restablecer(id, supervisor, { contrasena: NUEVA })).estado).toBe(204);
    expect(await hashEnBd(id)).not.toBe(hashViejo);
    expect((await login(correo, NUEVA)).estado).toBe(401);
  });

  it('CP-83 asesor y auxiliar reciben 403 y no se cambia nada; sin token 401', async () => {
    const { id } = await crearUsuario();
    for (const rol of ['asesor', 'auxiliar'] as const) {
      expect((await restablecer(id, tokenDe(rol), { contrasena: NUEVA })).estado).toBe(403);
    }
    expect((await restablecer(id, undefined, { contrasena: NUEVA })).estado).toBe(401);
    expect(await hashEnBd(id)).toBe(hashViejo);
  });

  it('CP-84 usuario inexistente 404; id que no es uuid 400', async () => {
    const r = await restablecer(randomUUID(), supervisor, { contrasena: NUEVA });
    expect(r.estado).toBe(404);
    expect(r.json.message).toBe('Usuario no encontrado.');
    expect((await restablecer('no-es-uuid', supervisor, { contrasena: NUEVA })).estado).toBe(400);
  });

  it('CP-85 cuerpo inválido (falta, corta, larga, tipo erróneo, campo extra) responde 400 y no cambia nada', async () => {
    const { id } = await crearUsuario();
    for (const cuerpo of [
      {},
      { contrasena: 'corta' },
      { contrasena: 'x'.repeat(73) },
      { contrasena: 12345678 },
      { contrasena: NUEVA, activo: false },
    ]) {
      expect((await restablecer(id, supervisor, cuerpo)).estado).toBe(400);
    }
    expect(await hashEnBd(id)).toBe(hashViejo);
  });

  it('CP-85 los límites de 8 y de 72 caracteres son válidos', async () => {
    for (const contrasena of ['a'.repeat(8), 'b'.repeat(72)]) {
      const { id, correo } = await crearUsuario();
      expect((await restablecer(id, supervisor, { contrasena })).estado).toBe(204);
      expect((await login(correo, contrasena)).estado).toBe(200);
    }
  });

  it('CP-92 ninguna respuesta incluye contrasena_hash ni el hash', async () => {
    const { id } = await crearUsuario();
    for (const r of [
      await restablecer(id, supervisor, { contrasena: NUEVA }),
      await restablecer(id, supervisor, {}),
      await restablecer(randomUUID(), supervisor, { contrasena: NUEVA }),
      await restablecer(id, tokenDe('asesor'), { contrasena: NUEVA }),
      await pedir(`/usuarios/${id}`, 'GET', supervisor),
    ]) {
      expect(r.texto).not.toContain('contrasena_hash');
      expect(r.texto).not.toContain(hashViejo);
    }
  });
});
