-- cliente_auxiliares.autorizado_por es NOT NULL (RF-41: guardar quién autorizó al auxiliar).
-- La migración 202610301003 ya crea la columna así; esta migración lo garantiza también en una base
-- creada antes de esa regla (p. ej. a partir del diccionario, que la marca NULLABLE).
-- No rellena valores: si hay filas sin autorizador, falla con un mensaje claro para corregirlas a mano.

DO $$
DECLARE
  filas_sin_autorizador BIGINT;
BEGIN
  SELECT count(*) INTO filas_sin_autorizador FROM cliente_auxiliares WHERE autorizado_por IS NULL;
  IF filas_sin_autorizador > 0 THEN
    RAISE EXCEPTION 'No se puede exigir cliente_auxiliares.autorizado_por NOT NULL: hay % fila(s) sin autorizador. Corrígelas manualmente (no se rellenan automáticamente) y vuelve a ejecutar la migración.', filas_sin_autorizador;
  END IF;
END
$$;

ALTER TABLE cliente_auxiliares ALTER COLUMN autorizado_por SET NOT NULL;
