import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { ROL_ID } from '../common/auth/roles-sistema';
import { tomarBloqueoEtl } from '../common/testing/bloqueo-etl';

// Prepara h3ga_test para las pruebas integrales de la Actividad 6 (pnpm pruebas:datos). Repetible:
// borra lo que dejó una corrida anterior (solo lo de los 4 usuarios de prueba y sus clientes) y vuelve a
// cargar usuarios, los 44 clientes del Excel ficticio (con EtlService, no con SQL) y 1,000 eventos de
// agenda como en CP-43. Solo corre contra una base local cuyo nombre termina en _test.
//
// Contraseñas: se leen de PRUEBAS_<ROL>_CONTRASENA; si faltan se generan al azar y se guardan en
// .env.pruebas (ignorado por git), que el comando de Newman lee. Nunca se imprimen ni se versionan.
const RAIZ = resolve(__dirname, '../../../..');
const FIXTURES = resolve(RAIZ, 'test/fixtures/etl');
const ARCHIVO_ENV = resolve(RAIZ, '.env.pruebas');
const EVENTOS = 1000;
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

// Los dos asesores llevan los correos del JSON de equivalencias: así el ETL les asigna sus clientes.
const equivalencias = JSON.parse(
  readFileSync(resolve(FIXTURES, 'equivalencias-asesores.json'), 'utf8'),
) as Record<string, string>;
const [correoAsesor1, correoAsesor2] = Object.values(equivalencias);

const USUARIOS = [
  {
    clave: 'supervisor',
    rol: ROL_ID.supervisor,
    nombre: 'Supervisor',
    correo: 'supervisor.integrales@ejemplo.test',
  },
  { clave: 'asesor1', rol: ROL_ID.asesor, nombre: 'Asesor Uno', correo: correoAsesor1 },
  { clave: 'asesor2', rol: ROL_ID.asesor, nombre: 'Asesor Dos', correo: correoAsesor2 },
  {
    clave: 'auxiliar',
    rol: ROL_ID.auxiliar,
    nombre: 'Auxiliar',
    correo: 'auxiliar.integrales@ejemplo.test',
  },
];

function validarBdPruebas(url: string | undefined): string {
  if (!url) throw new Error('Falta TEST_DATABASE_URL (defínela en .env).');
  const destino = new URL(url);
  const nombre = decodeURIComponent(destino.pathname.replace(/^\//, ''));
  if (!HOSTS_LOCALES.has(destino.hostname)) throw new Error('La base de pruebas debe ser local.');
  if (!/^[a-z0-9_]+_test$/.test(nombre))
    throw new Error('La base de pruebas debe llamarse *_test.');
  return url;
}

function contrasenas(): Record<string, string> {
  const guardadas: Record<string, string> = {};
  if (existsSync(ARCHIVO_ENV)) {
    for (const linea of readFileSync(ARCHIVO_ENV, 'utf8').split(/\r?\n/)) {
      const m = /^(PRUEBAS_[A-Z0-9]+_CONTRASENA)=(.+)$/.exec(linea);
      if (m) guardadas[m[1]] = m[2];
    }
  }
  const resultado: Record<string, string> = {};
  let nuevas = false;
  for (const u of USUARIOS) {
    const variable = `PRUEBAS_${u.clave.toUpperCase()}_CONTRASENA`;
    const valor =
      process.env[variable] || guardadas[variable] || randomBytes(12).toString('base64url');
    if (!process.env[variable] && !guardadas[variable]) nuevas = true;
    resultado[u.clave] = valor;
  }
  // Se (re)escribe el archivo con los correos y contraseñas que usa Newman (ignorado por git).
  if (nuevas || !existsSync(ARCHIVO_ENV)) {
    const lineas = USUARIOS.flatMap((u) => [
      `PRUEBAS_${u.clave.toUpperCase()}_CORREO=${u.correo}`,
      `PRUEBAS_${u.clave.toUpperCase()}_CONTRASENA=${resultado[u.clave]}`,
    ]);
    writeFileSync(ARCHIVO_ENV, `${lineas.join('\n')}\n`);
  }
  return resultado;
}

// Borra las filas de `tabla` que cumplen `donde` y, antes, todo lo que las referencia por llave foránea
// (recursivo, leyendo las llaves de pg_constraint): así la limpieza no depende de una lista a mano de tablas.
async function borrarEn(
  ds: DataSource,
  tabla: string,
  donde: string,
  parametros: unknown[],
  ruta: string[] = [],
): Promise<void> {
  const hijas = await ds.query<{ hija: string; columna: string; ref: string }[]>(
    `SELECT c.conrelid::regclass::text AS hija, a.attname AS columna, r.attname AS ref
       FROM pg_constraint c
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
       JOIN pg_attribute r ON r.attrelid = c.confrelid AND r.attnum = c.confkey[1]
      WHERE c.contype = 'f' AND c.confrelid = $1::regclass`,
    [tabla],
  );
  for (const h of hijas) {
    if (h.hija === tabla || ruta.includes(h.hija)) continue;
    await borrarEn(
      ds,
      h.hija,
      `${h.columna} IN (SELECT ${h.ref} FROM ${tabla} WHERE ${donde})`,
      parametros,
      [...ruta, tabla],
    );
  }
  await ds.query(`DELETE FROM ${tabla} WHERE ${donde}`, parametros);
}

// Borra los 4 usuarios de prueba y, por sus llaves foráneas, sus clientes, etapas, eventos, avisos,
// diagnósticos, documentos, etc. Solo toca lo que cuelga de esos usuarios.
async function limpiar(ds: DataSource): Promise<void> {
  const correos = USUARIOS.map((u) => u.correo.toLowerCase());
  await borrarEn(ds, 'usuarios', 'lower(correo_electronico) = ANY($1)', [correos]);
}

async function principal(): Promise<void> {
  const url = validarBdPruebas(process.env.TEST_DATABASE_URL);
  process.env.DATABASE_URL = url; // la aplicación se conecta a la base de pruebas, nunca a la de desarrollo
  const claves = contrasenas();

  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../app.module');
  const { EtlService } = await import('../etl/etl.service');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ds = app.get(DataSource);
  const liberar = await tomarBloqueoEtl(ds);
  try {
    await limpiar(ds);
    const ids: Record<string, string> = {};
    for (const u of USUARIOS) {
      const filas = await ds.query<{ id: string }[]>(
        `INSERT INTO usuarios (rol_id, nombre, apellido_paterno, apellido_materno, correo_electronico,
           contrasena_hash, activo, fecha_creacion)
         VALUES ($1, $2, 'Integrales', 'Ficticio', $3, $4, true, now()) RETURNING id`,
        [u.rol, u.nombre, u.correo, await hash(claves[u.clave], 10)],
      );
      ids[u.clave] = filas[0].id;
    }

    const archivo = resolve(FIXTURES, 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx');
    const reporte = await app.get(EtlService, { strict: false }).importar(readFileSync(archivo), {
      nombreArchivo: 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
      ejecutorId: ids.supervisor,
      modo: 'comando',
      equivalencias,
    });
    if (!reporte.conciliacion.ok) throw new Error('La conciliación de la importación falló.');

    // 1,000 eventos del Asesor 1 sobre uno de sus clientes, repartidos en hoy y los dos días siguientes (fecha de Cancún, la zona del sistema).
    const cliente = await ds.query<{ id: string }[]>(
      `SELECT id FROM clientes WHERE asesor_id = $1 ORDER BY id LIMIT 1`,
      [ids.asesor1],
    );
    if (!cliente[0]) throw new Error('El Asesor 1 no recibió clientes del ETL.');
    await ds.query(
      `INSERT INTO eventos_agenda (asesor_id, cliente_id, fecha, hora, motivo, estatus)
       SELECT $1, $2, (now() AT TIME ZONE 'America/Cancun')::date + (g % 3), '09:00', 'Cita ficticia ' || g, 'pendiente'
         FROM generate_series(1, ${EVENTOS}) g`,
      [ids.asesor1, cliente[0].id],
    );

    const total = await ds.query<{ clientes: string; eventos: string }[]>(
      `SELECT (SELECT count(*) FROM clientes WHERE asesor_id IN ($1, $2)) AS clientes,
              (SELECT count(*) FROM eventos_agenda WHERE asesor_id = $1) AS eventos`,
      [ids.asesor1, ids.asesor2],
    );
    console.log(
      `Datos listos en la base de pruebas: ${USUARIOS.length} usuarios, ${total[0].clientes} clientes (ETL: ${reporte.totales.cargados} cargados, ${reporte.totales.rechazados} rechazados), ${total[0].eventos} eventos. Credenciales en .env.pruebas.`,
    );
  } finally {
    await liberar();
    await app.close();
  }
}

principal().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(`Error: ${error instanceof Error ? error.message : 'falló la preparación.'}`);
    process.exit(1);
  },
);
