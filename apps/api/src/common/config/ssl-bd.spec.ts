import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { opcionesSslBd, urlSinSslmode } from './ssl-bd';
import { validarEntorno } from './validar-entorno';

// DATABASE_SSL activa TLS hacia la base (PostgreSQL administrado). Sin la variable todo queda como en local.
// Los certificados y valores son ficticios.
const PEM = '-----BEGIN CERTIFICATE-----\nFICTICIO\n-----END CERTIFICATE-----';

describe('opcionesSslBd', () => {
  it.each([undefined, '', '  ', 'false', '0', 'disable'])(
    'CP-352 sin TLS cuando DATABASE_SSL es %p (comportamiento local)',
    (valor) => {
      expect(opcionesSslBd({ DATABASE_SSL: valor })).toBeUndefined();
      expect(opcionesSslBd({ DATABASE_SSL: valor, DATABASE_SSL_CA: PEM })).toBeUndefined();
    },
  );

  it.each(['true', 'require', 'TRUE'])(
    'CP-353 con %p activa TLS verificando el certificado',
    (v) => {
      expect(opcionesSslBd({ DATABASE_SSL: v })).toEqual({ rejectUnauthorized: true });
    },
  );

  it('CP-353 con DATABASE_SSL_CA verifica contra esa CA; acepta \\n escritos como texto', () => {
    expect(opcionesSslBd({ DATABASE_SSL: 'true', DATABASE_SSL_CA: PEM })).toEqual({
      rejectUnauthorized: true,
      ca: PEM,
    });
    expect(
      opcionesSslBd({ DATABASE_SSL: 'true', DATABASE_SSL_CA: PEM.replace(/\n/g, '\\n') }),
    ).toEqual({ rejectUnauthorized: true, ca: PEM });
  });

  // Causa del SELF_SIGNED_CERT_IN_CHAIN en DigitalOcean: el panel pega el PEM aplanado y pg descarta la CA
  // ilegible sin avisar. Se reconstruye el PEM antes de pasarlo.
  it.each([
    ['una sola línea con espacios', PEM.replace(/\n/g, ' ')],
    ['entre comillas con \\n', `"${PEM.replace(/\n/g, '\\n')}"`],
    ['con CRLF', PEM.replace(/\n/g, '\r\n')],
    ['con espacios y saltos sobrantes', `\n  ${PEM}  \n\n`],
    ['solo el cuerpo base64, sin cabeceras', 'FICTICIO'],
  ])('CP-359 normaliza la CA %s a un PEM válido', (_n, valor) => {
    expect(opcionesSslBd({ DATABASE_SSL: 'true', DATABASE_SSL_CA: valor })).toEqual({
      rejectUnauthorized: true,
      ca: PEM,
    });
  });

  it('CP-359 parte el cuerpo en líneas de 64 y conserva varios certificados', () => {
    const cuerpo = 'A'.repeat(130);
    const un = (c: string) => `-----BEGIN CERTIFICATE-----\n${c}\n-----END CERTIFICATE-----`;
    const salida = opcionesSslBd({
      DATABASE_SSL: 'true',
      DATABASE_SSL_CA: `${un(cuerpo)} ${un('BBBB')}`,
    });
    expect(salida?.ca).toBe(
      `-----BEGIN CERTIFICATE-----\n${'A'.repeat(64)}\n${'A'.repeat(64)}\nAA\n-----END CERTIFICATE-----\n${un('BBBB')}`,
    );
  });

  it('CP-360 DATABASE_SSL_CA_BASE64 se decodifica y manda sobre DATABASE_SSL_CA', () => {
    const b64 = Buffer.from(PEM, 'utf8').toString('base64');
    expect(opcionesSslBd({ DATABASE_SSL: 'true', DATABASE_SSL_CA_BASE64: b64 })).toEqual({
      rejectUnauthorized: true,
      ca: PEM,
    });
    expect(
      opcionesSslBd({ DATABASE_SSL: 'true', DATABASE_SSL_CA_BASE64: b64, DATABASE_SSL_CA: 'otro' }),
    ).toEqual({ rejectUnauthorized: true, ca: PEM });
    // también si el panel lo parte en líneas o lo envuelve en comillas
    expect(
      opcionesSslBd({
        DATABASE_SSL: 'true',
        DATABASE_SSL_CA_BASE64: `"${b64.slice(0, 10)}\n${b64.slice(10)}"`,
      }),
    ).toEqual({ rejectUnauthorized: true, ca: PEM });
  });

  it('CP-361 una CA ilegible falla nombrando la variable y sin citar el valor', () => {
    for (const env of [
      { DATABASE_SSL_CA: 'valor-secreto con !!! basura' },
      { DATABASE_SSL_CA_BASE64: '***secreto***' },
    ]) {
      let error: Error | undefined;
      try {
        opcionesSslBd({ DATABASE_SSL: 'true', ...env });
      } catch (e) {
        error = e as Error;
      }
      expect(error?.message).toMatch(/DATABASE_SSL_CA/);
      expect(error?.message).not.toContain('secreto');
    }
  });

  it('CP-354 no-verify cifra pero no verifica el certificado (solo para depurar)', () => {
    expect(opcionesSslBd({ DATABASE_SSL: 'no-verify' })).toEqual({ rejectUnauthorized: false });
  });

  it('CP-355 un valor desconocido falla nombrando la variable y sin citar el valor', () => {
    const error = (() => {
      try {
        opcionesSslBd({ DATABASE_SSL: 'secreto-raro' });
      } catch (e) {
        return e as Error;
      }
    })();
    expect(error?.message).toMatch(/DATABASE_SSL/);
    expect(error?.message).not.toContain('secreto-raro');
  });

  it('CP-355 validarEntorno rechaza un DATABASE_SSL inválido y acepta los válidos', () => {
    expect(() => validarEntorno({ DATABASE_SSL: 'quizas' })).toThrow(/DATABASE_SSL/);
    expect(() => validarEntorno({ DATABASE_SSL: 'true' })).not.toThrow();
    expect(() => validarEntorno({})).not.toThrow();
  });
});

describe('urlSinSslmode', () => {
  it('CP-356 quita sslmode de la URL para que mande DATABASE_SSL, y deja lo demás', () => {
    expect(urlSinSslmode('postgresql://u:p@host:25060/bd?sslmode=require&application_name=x')).toBe(
      'postgresql://u:p@host:25060/bd?application_name=x',
    );
    expect(urlSinSslmode('postgresql://u:p@host:25060/bd?sslmode=require')).toBe(
      'postgresql://u:p@host:25060/bd',
    );
    expect(urlSinSslmode('postgresql://u:p@localhost:5432/bd')).toBe(
      'postgresql://u:p@localhost:5432/bd',
    );
  });
});

// db/ssl-bd.mjs lo usan db:migrate y db:seed:supervisor (scripts .mjs, que no importan TypeScript):
// debe dar lo mismo que la versión de la API.
describe('db/ssl-bd.mjs (scripts de migración)', () => {
  const modulo = resolve(__dirname, '../../../../../db/ssl-bd.mjs');
  const ejecutar = (env: Record<string, string>) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import { opcionesSslBd, urlSinSslmode } from ${JSON.stringify(`file:///${modulo.replace(/\\/g, '/')}`)};
           console.log(JSON.stringify({ ssl: opcionesSslBd(process.env) ?? null, url: urlSinSslmode('postgresql://u:p@h/bd?sslmode=require') }));`,
        ],
        { env: { PATH: process.env.PATH ?? '', ...env }, encoding: 'utf8' },
      ),
    ) as { ssl: unknown; url: string };

  it('CP-357 sin variable no hay TLS; con true verifica; con CA la usa; quita sslmode', () => {
    expect(ejecutar({}).ssl).toBeNull();
    expect(ejecutar({ DATABASE_SSL: 'true' }).ssl).toEqual({ rejectUnauthorized: true });
    expect(ejecutar({ DATABASE_SSL: 'true', DATABASE_SSL_CA: PEM }).ssl).toEqual({
      rejectUnauthorized: true,
      ca: PEM,
    });
    expect(
      ejecutar({ DATABASE_SSL: 'true', DATABASE_SSL_CA: PEM.replace(/\n/g, ' ') }).ssl,
    ).toEqual({
      rejectUnauthorized: true,
      ca: PEM,
    });
    expect(
      ejecutar({
        DATABASE_SSL: 'true',
        DATABASE_SSL_CA_BASE64: Buffer.from(PEM, 'utf8').toString('base64'),
      }).ssl,
    ).toEqual({ rejectUnauthorized: true, ca: PEM });
    expect(ejecutar({ DATABASE_SSL: 'no-verify' }).ssl).toEqual({ rejectUnauthorized: false });
    expect(ejecutar({}).url).toBe('postgresql://u:p@h/bd');
  });
});
