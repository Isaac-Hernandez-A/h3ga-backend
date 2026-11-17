import { DataSource } from 'typeorm';

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
