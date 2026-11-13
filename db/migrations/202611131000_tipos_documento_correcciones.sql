-- Módulo «Correcciones»: tres tipos de documento nuevos en el catálogo tipo_documento, en este orden
-- (los ids los asigna la identidad, a continuación de los existentes):
--   F3 Unificación de NSS: la certificación del IMSS.
--   F4 Recuperación de semanas: la constancia de aclaración (IMSS) y la solicitud de reintegro (AFORE).
-- Idempotente: no inserta un nombre que ya exista. No modifica ni borra filas.

INSERT INTO tipo_documento (nombre)
SELECT v.nombre
FROM (VALUES
  (1, 'Certificación de regularización y/o corrección de datos personales del asegurado (IMSS)'),
  (2, 'Constancia de Aclaración de Semanas Cotizadas (IMSS)'),
  (3, 'Solicitud de Reintegro de Recursos (AFORE)')
) AS v(orden, nombre)
WHERE NOT EXISTS (SELECT 1 FROM tipo_documento t WHERE t.nombre = v.nombre)
ORDER BY v.orden;
