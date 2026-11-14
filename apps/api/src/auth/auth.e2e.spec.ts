import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Rol } from '../common/auth/authenticated-user';
import { ROL_ID } from '../common/auth/roles-sistema';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { DOMINIO_USUARIOS, limpiarDatosClientes } from '../common/testing/datos-clientes';
import { SECRETO_PRUEBA } from '../common/testing/tokens';

// Flujo HTTP real: AppModule completo contra la base de pruebas. Solo datos ficticios.
jest.setTimeout(60_000);

const CONTRASENA = 'contrasena-ficticia-123';
const ROLES: Rol[] = ['asesor', 'auxiliar', 'supervisor'];

interface Sesion {
  access_token: string;
}

describeConBd('Inicio de sesión (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let hashFicticio: string;

  async function crearUsuario(rol: Rol, extra: { activo?: boolean } = {}) {
    const id = randomUUID();
    const correo = `${rol}-${id}${DOMINIO_USUARIOS}`;
    await ctx.ds.query(
      `INSERT INTO usuarios (id, rol_id, nombre, apellido_paterno, apellido_materno,
         correo_electronico, contrasena_hash, activo, fecha_creacion)
       VALUES ($1, $2, 'Prueba', 'Ficticio', 'Ficticio', $3, $4, $5, now())`,
      [id, ROL_ID[rol], correo, hashFicticio, extra.activo ?? true],
    );
    return { id, correo };
  }

  async function pedir(ruta: string, token?: string, cuerpo?: unknown, metodo = 'GET') {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
    const texto = await respuesta.text();
    return {
      estado: respuesta.status,
      texto,
      json: (texto ? JSON.parse(texto) : {}) as Record<string, unknown>,
    };
  }
  const login = (correo: string, contrasena: string) =>
    pedir('/auth/login', undefined, { correo_electronico: correo, contrasena }, 'POST');

  beforeAll(async () => {
    hashFicticio = await hash(CONTRASENA, 4);
    ctx = await iniciarAppConBd();
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-69 login correcto: 200 con access_token, expires_in 28800 y usuario {id, nombre, rol}; el token trae sub, rol y exp a 8 horas', async () => {
    const { id, correo } = await crearUsuario('asesor');
    const antes = Math.floor(Date.now() / 1000);
    const r = await login(correo, CONTRASENA);
    expect(r.estado).toBe(200);
    expect(r.json).toEqual({
      access_token: expect.any(String) as string,
      expires_in: 28800,
      usuario: { id, nombre: 'Prueba Ficticio', rol: 'asesor' },
    });
    const payload = new JwtService({ secret: SECRETO_PRUEBA }).verify<{
      sub: string;
      rol: string;
      exp: number;
    }>((r.json as unknown as Sesion).access_token, { algorithms: ['HS256'] });
    expect(payload.sub).toBe(id);
    expect(payload.rol).toBe('asesor');
    expect(payload.exp).toBeGreaterThanOrEqual(antes + 28800);
    expect(payload.exp).toBeLessThanOrEqual(antes + 28800 + 10);
  });

  it('CP-69 el correo no distingue mayúsculas', async () => {
    const { correo } = await crearUsuario('supervisor');
    expect((await login(correo.toUpperCase(), CONTRASENA)).estado).toBe(200);
  });

  it('CP-70 el token emitido lo acepta el guard existente en GET /clientes para cada rol', async () => {
    for (const rol of ROLES) {
      const { correo } = await crearUsuario(rol);
      const sesion = await login(correo, CONTRASENA);
      expect(sesion.estado).toBe(200);
      const clientes = await pedir('/clientes', (sesion.json as unknown as Sesion).access_token);
      expect(clientes.estado).toBe(200);
    }
  });

  it('CP-71 contraseña incorrecta, correo inexistente y usuario inactivo responden 401 con el mismo mensaje', async () => {
    const activo = await crearUsuario('asesor');
    const inactivo = await crearUsuario('asesor', { activo: false });
    const respuestas = [
      await login(activo.correo, 'contrasena-equivocada'),
      await login(`nadie-${randomUUID()}${DOMINIO_USUARIOS}`, CONTRASENA),
      await login(inactivo.correo, CONTRASENA),
    ];
    for (const r of respuestas) expect(r.estado).toBe(401);
    const mensajes = respuestas.map((r) => r.json.message);
    expect(new Set(mensajes).size).toBe(1);
    expect(mensajes[0]).toBe('Correo o contraseña incorrectos.');
  });

  it('CP-72 ninguna respuesta del login incluye contrasena_hash ni el hash', async () => {
    const { correo } = await crearUsuario('auxiliar');
    const inactivo = await crearUsuario('auxiliar', { activo: false });
    for (const r of [
      await login(correo, CONTRASENA),
      await login(correo, 'mala'),
      await login(inactivo.correo, CONTRASENA),
      await pedir('/auth/login', undefined, {}, 'POST'),
    ]) {
      expect(r.texto).not.toContain('contrasena_hash');
      expect(r.texto).not.toContain(hashFicticio);
    }
  });

  it('CP-73 cuerpo sin correo o sin contraseña responde 400', async () => {
    for (const cuerpo of [
      {},
      { correo_electronico: `a${DOMINIO_USUARIOS}` },
      { contrasena: CONTRASENA },
      { correo_electronico: '', contrasena: CONTRASENA },
      { correo_electronico: `a${DOMINIO_USUARIOS}`, contrasena: '' },
    ]) {
      expect((await pedir('/auth/login', undefined, cuerpo, 'POST')).estado).toBe(400);
    }
  });

  it('CP-80 un token vencido emitido por el login responde 401 en una ruta protegida', async () => {
    const { correo } = await crearUsuario('supervisor');
    const sesion = await login(correo, CONTRASENA);
    const token = (sesion.json as unknown as Sesion).access_token;
    expect((await pedir('/clientes', token)).estado).toBe(200);

    // Reloj controlado: solo se adelanta Date.now (no hay temporizadores falsos que rompan el servidor).
    const ahora = Date.now();
    const espia = jest.spyOn(Date, 'now').mockReturnValue(ahora + (28800 + 60) * 1000);
    try {
      expect((await pedir('/clientes', token)).estado).toBe(401);
    } finally {
      espia.mockRestore();
    }
  });
});
