import { DataSource } from 'typeorm';
import { codigoPostgres, PG_VIOLACION_LLAVE_FORANEA } from '../database/errores-postgres';

// Las suites de la ETL que cargan el Excel ficticio (servicio, endpoint y comando) usan las MISMAS CURP del
// fixture y Jest corre las suites en paralelo sobre la misma base de pruebas: sin esto se pisan (CURP
// repetida, conteos que no cuadran). Cada una toma este candado asesor de PostgreSQL al empezar y lo suelta
// al terminar, así que corren una tras otra. Es un candado de sesión: se guarda una conexión dedicada.
const CLAVE = 'h3ga-etl-fixture-ficticio';

export async function tomarBloqueoEtl(ds: DataSource): Promise<() => Promise<void>> {
  const conexion = ds.createQueryRunner();
  await conexion.connect();
  await conexion.query('SELECT pg_advisory_lock(hashtext($1))', [CLAVE]);
  return async () => {
    try {
      await conexion.query('SELECT pg_advisory_unlock(hashtext($1))', [CLAVE]);
    } finally {
      await conexion.release();
    }
  };
}

// Borra clientes y todo lo que cuelga de sus etapas, en el orden que exigen las llaves foráneas: avisos,
// historial, etapas y clientes. La bandeja de avisos (otra suite que corre en paralelo) genera avisos para
// TODAS las etapas, también las de los clientes de estas pruebas; si aparece uno entre el borrado de los
// avisos y el de las etapas, se reintenta. `donde` es la condición sobre `clientes`.
export async function borrarClientesConEtapas(
  ds: DataSource,
  donde: string,
  parametros: unknown[],
): Promise<void> {
  const etapas = `SELECT id FROM etapas_tramite WHERE cliente_id IN (SELECT id FROM clientes WHERE ${donde})`;
  for (let intento = 1; ; intento++) {
    try {
      await ds.query(`DELETE FROM avisos WHERE etapa_tramite_id IN (${etapas})`, parametros);
      await ds.query(
        `DELETE FROM etapas_tramite_historial WHERE etapa_tramite_id IN (${etapas})`,
        parametros,
      );
      await ds.query(
        `DELETE FROM etapas_tramite WHERE cliente_id IN (SELECT id FROM clientes WHERE ${donde})`,
        parametros,
      );
      await ds.query(`DELETE FROM clientes WHERE ${donde}`, parametros);
      return;
    } catch (error) {
      if (codigoPostgres(error) !== PG_VIOLACION_LLAVE_FORANEA || intento >= 5) throw error;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}
