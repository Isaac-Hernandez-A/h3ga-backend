import { randomUUID } from 'node:crypto';
import { ROL_ID } from '../common/auth/roles-sistema';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { tokenDe } from '../common/testing/tokens';

// Flujo HTTP real: AppModule completo (guards, pipes, filtro de errores) contra la base de pruebas.
// Solo datos ficticios; se borran al final los usuarios @ejemplo.invalid creados por estas pruebas.
jest.setTimeout(60_000);

const CONTRASENA = 'contrasena-ficticia-123';

describeConBd('Usuarios y roles (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  const supervisor = tokenDe('supervisor');
  const asesor = tokenDe('asesor');
  const auxiliar = tokenDe('auxiliar');

  const cuerpo = (extra: object = {}) => ({
    rol_id: ROL_ID.supervisor,
    nombre: 'Prueba',
    apellido_paterno: 'Ficticio',
    apellido_materno: 'Ficticio',
    correo_electronico: `prueba-${randomUUID()}@ejemplo.invalid`,
    contrasena: CONTRASENA,
    ...extra,
  });

  async function pedir(metodo: string, ruta: string, token?: string, datos?: object) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(datos ? { 'Content-Type': 'application/json' } : {}),
      },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    const texto = await respuesta.text();
    const json = texto ? (JSON.parse(texto) as Record<string, unknown>) : {};
    return { estado: respuesta.status, json };
  }

  const crear = async (extra: object = {}) => {
    const { estado, json } = await pedir('POST', '/usuarios', supervisor, cuerpo(extra));
    expect(estado).toBe(201);
    return json as { id: string; correo_electronico: string; activo: boolean };
  };

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
  });

  afterAll(async () => {
    if (!ctx) return;
    await ctx.ds.query("DELETE FROM usuarios WHERE correo_electronico LIKE '%@ejemplo.invalid'");
    await ctx.app.close();
  });

  it('CP-08 supervisor crea usuario: 201, sin contrasena_hash en la respuesta y hash bcrypt en BD', async () => {
    const { estado, json } = await pedir('POST', '/usuarios', supervisor, cuerpo());
    expect(estado).toBe(201);
    expect(json).not.toHaveProperty('contrasena_hash');
    expect(json).not.toHaveProperty('contrasena');

    const filas = await ctx.ds.query<{ contrasena_hash: string }[]>(
      'SELECT contrasena_hash FROM usuarios WHERE id = $1',
      [json.id],
    );
    expect(filas[0].contrasena_hash.startsWith('$2')).toBe(true);
    expect(filas[0].contrasena_hash).not.toBe(CONTRASENA);
  });

  it('CP-09 correo repetido responde 409', async () => {
    const existente = await crear();
    const { estado } = await pedir(
      'POST',
      '/usuarios',
      supervisor,
      cuerpo({ correo_electronico: existente.correo_electronico }),
    );
    expect(estado).toBe(409);
  });

  it('CP-10 asesor y auxiliar no pueden crear ni editar usuarios (403)', async () => {
    const existente = await crear();
    for (const token of [asesor, auxiliar]) {
      expect((await pedir('POST', '/usuarios', token, cuerpo())).estado).toBe(403);
      expect(
        (await pedir('PATCH', `/usuarios/${existente.id}`, token, { activo: false })).estado,
      ).toBe(403);
    }
  });

  it('CP-11 PATCH activo=false desactiva sin borrar; el listado filtra por activo', async () => {
    const usuario = await crear();
    const { estado, json } = await pedir('PATCH', `/usuarios/${usuario.id}`, supervisor, {
      activo: false,
    });
    expect(estado).toBe(200);
    expect(json.activo).toBe(false);

    const filas = await ctx.ds.query<{ activo: boolean }[]>(
      'SELECT activo FROM usuarios WHERE id = $1',
      [usuario.id],
    );
    expect(filas).toEqual([{ activo: false }]);

    const ids = async (activo: boolean) =>
      (
        (await pedir('GET', `/usuarios?activo=${activo}`, supervisor)).json as unknown as {
          id: string;
        }[]
      ).map((u) => u.id);
    expect(await ids(false)).toContain(usuario.id);
    expect(await ids(true)).not.toContain(usuario.id);
  });

  it('CP-12 tipo_asesor_id inexistente responde 400; nulo es válido', async () => {
    const inexistente = await pedir(
      'POST',
      '/usuarios',
      supervisor,
      cuerpo({ rol_id: ROL_ID.asesor, tipo_asesor_id: 30000 }),
    );
    expect(inexistente.estado).toBe(400);

    const nulo = await pedir(
      'POST',
      '/usuarios',
      supervisor,
      cuerpo({ rol_id: ROL_ID.asesor, tipo_asesor_id: null }),
    );
    expect(nulo.estado).toBe(201);
    expect(nulo.json.tipo_asesor_id).toBeNull();
  });

  it('un rol_id o tipo_asesor_id fuera del rango de SMALLINT responde 400, no 500', async () => {
    for (const extra of [
      { rol_id: 999999 },
      { rol_id: ROL_ID.asesor, tipo_asesor_id: 999999 },
      { rol_id: 0 },
      { rol_id: -1 },
    ]) {
      expect((await pedir('POST', '/usuarios', supervisor, cuerpo(extra))).estado).toBe(400);
    }
    const usuario = await crear();
    expect(
      (await pedir('PATCH', `/usuarios/${usuario.id}`, supervisor, { rol_id: 999999 })).estado,
    ).toBe(400);
  });

  it('CP-13 los tres roles pueden leer el catálogo de roles', async () => {
    for (const token of [asesor, auxiliar, supervisor]) {
      const { estado, json } = await pedir('GET', '/catalogos/roles', token);
      expect(estado).toBe(200);
      const roles = json as unknown as { id: number; nombre: string }[];
      expect(roles).toHaveLength(3);
    }
  });

  it('los ids de ROL_ID coinciden con la semilla de la tabla roles', async () => {
    const filas = await ctx.ds.query<{ id: number; nombre: string }[]>(
      'SELECT id, nombre FROM roles ORDER BY id',
    );
    expect(filas.map((f) => [f.id, f.nombre])).toEqual([
      [ROL_ID.asesor, 'Asesor'],
      [ROL_ID.auxiliar, 'Auxiliar Administrativo'],
      [ROL_ID.supervisor, 'Supervisor Operativo (Admin)'],
    ]);
  });

  it('el catálogo de tipos de asesor (de otro módulo) se lee y no se escribe aquí', async () => {
    const { estado, json } = await pedir('GET', '/catalogos/tipos-asesor', supervisor);
    expect(estado).toBe(200);
    expect(Array.isArray(json)).toBe(true);
  });

  it('obtener un usuario no devuelve el hash; uno inexistente responde 404', async () => {
    const usuario = await crear();
    const encontrado = await pedir('GET', `/usuarios/${usuario.id}`, supervisor);
    expect(encontrado.estado).toBe(200);
    expect(encontrado.json).not.toHaveProperty('contrasena_hash');
    expect((await pedir('GET', `/usuarios/${randomUUID()}`, supervisor)).estado).toBe(404);
  });

  it('valida el cuerpo: correo inválido, contraseña corta o campos no permitidos responden 400', async () => {
    for (const extra of [
      { correo_electronico: 'no-es-un-correo' },
      { contrasena: 'corta' },
      { contrasena_hash: 'intento-de-inyectar-un-hash' },
    ]) {
      expect((await pedir('POST', '/usuarios', supervisor, cuerpo(extra))).estado).toBe(400);
    }
  });
});
