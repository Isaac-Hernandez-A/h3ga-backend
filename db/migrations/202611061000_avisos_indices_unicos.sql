-- Un aviso por etapa o evento y fecha de alerta (D4). Los avisos se generan al consultar la bandeja (RF-28),
-- así que dos consultas simultáneas no deben duplicarlos: la unicidad la garantiza la base con
-- INSERT ... ON CONFLICT DO NOTHING. Son índices parciales porque exactamente uno de los dos orígenes
-- (etapa_tramite_id o evento_id) está lleno (CHECK de avisos).
-- No borra datos: si ya hay avisos duplicados falla con un mensaje claro para corregirlos a mano.

DO $$
DECLARE
  duplicados BIGINT;
BEGIN
  SELECT count(*) INTO duplicados FROM (
    SELECT 1 FROM avisos WHERE etapa_tramite_id IS NOT NULL
      GROUP BY etapa_tramite_id, fecha_alerta HAVING count(*) > 1
    UNION ALL
    SELECT 1 FROM avisos WHERE evento_id IS NOT NULL
      GROUP BY evento_id, fecha_alerta HAVING count(*) > 1
  ) d;
  IF duplicados > 0 THEN
    RAISE EXCEPTION 'No se pueden crear los índices únicos de avisos: hay % grupo(s) de avisos duplicados (misma etapa o evento y misma fecha_alerta). Corrígelos manualmente y vuelve a ejecutar la migración.', duplicados;
  END IF;
END
$$;

CREATE UNIQUE INDEX uq_avisos_etapa_fecha_alerta
  ON avisos (etapa_tramite_id, fecha_alerta)
  WHERE etapa_tramite_id IS NOT NULL;

CREATE UNIQUE INDEX uq_avisos_evento_fecha_alerta
  ON avisos (evento_id, fecha_alerta)
  WHERE evento_id IS NOT NULL;
