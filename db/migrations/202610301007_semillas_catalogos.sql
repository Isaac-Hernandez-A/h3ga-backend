-- Datos semilla de catálogos, con los valores listados en docs/diccionario.md.
-- tipos_asesor NO se siembra: es de otro módulo y sus valores los define su dueño.
-- estatus_tramite.descripcion: el diccionario la deja "definida por H3GA" sin dar textos. Las descripciones
-- sembradas aquí son PROVISIONALES, redactadas a partir de las reglas de avance del diccionario;
-- H3GA debe confirmarlas.

INSERT INTO roles (nombre) VALUES
  ('Asesor'),
  ('Auxiliar Administrativo'),
  ('Supervisor Operativo (Admin)');

INSERT INTO regimen_principal (nombre) VALUES
  ('IMSS'), ('ISSSTE'), ('Mixto IMSS-ISSSTE'), ('Independiente'), ('No determinado');

INSERT INTO ley_probable (nombre) VALUES
  ('Ley 73'), ('Ley 97'), ('Décimo Transitorio ISSSTE'), ('Cuenta Individual ISSSTE'),
  ('Mixto/revisar'), ('No determinado');

INSERT INTO afore (nombre) VALUES
  ('Azteca'), ('Profuturo'), ('Citibanamex'), ('Coppel'), ('Inbursa'), ('Invercap'),
  ('PENSIONISSSTE'), ('Principal'), ('Sura'), ('XXI Banorte');

INSERT INTO tipo_documento (nombre) VALUES
  ('Acta de Nacimiento'),
  ('CURP'),
  ('INE'),
  ('Comprobante de Domicilio'),
  ('RFC'),
  ('Constancia de Semanas Cotizadas (IMSS)'),
  ('Reporte de semanas cotizadas'),
  ('Estado de Cuenta AFORE'),
  ('Historial Laboral / Reporte Detallado IMSS'),
  ('Comprobantes de pagos Modalidad 10'),
  ('Comprobantes de pagos Modalidad 40 / 40 retroactivo'),
  ('Resoluciones, Negativas o Trámites Previos'),
  ('Recibos de Nómina / Constancias Laborales'),
  ('Semanas ISSSTE / Constancia de Portabilidad');

INSERT INTO etapas_proceso (numero_paso, nombre) VALUES
  (0, 'Diagnóstico inicial'),
  (1, 'Diagnóstico especializado'),
  (2, 'Corrección de datos personales'),
  (3, 'Unificación de NSS'),
  (4, 'Aclaración/recuperación de semanas'),
  (5, 'Estrategia Modalidad 10'),
  (6, 'Estrategia Modalidad 40'),
  (7, 'Modalidad 40 retroactiva'),
  (8, 'IMSS-ISSSTE/doble pensión'),
  (9, 'Unificación AFORE/cuentas'),
  (10, 'SAR 92'),
  (11, 'Solicitud de pensión'),
  (12, 'Negativa de pensión/recuperación de recursos'),
  (13, 'Juicio/Jurisdicción'),
  (14, 'Cobranza Final'),
  (15, 'Finalización');

-- ids 1 a 9 fijados por el diccionario (estatus_tramite.id no es autoincremental).
INSERT INTO estatus_tramite
  (id, nombre, descripcion, categoria, avance_porcentaje_fijo, avance_editable, avance_min, avance_max)
VALUES
  (1, 'No aplica',
   'La etapa no corresponde a la estrategia del cliente; no cuenta para el avance global.',
   'no_aplica', NULL, false, NULL, NULL),
  (2, 'Por iniciar',
   'La etapa aún no inicia; el avance se fija en 10 %.',
   'pendiente', 10, false, NULL, NULL),
  (3, 'En proceso cliente',
   'La etapa está en curso y la acción pendiente depende del cliente; el asesor ajusta el avance entre 20 y 90 %.',
   'en_proceso', NULL, true, 20, 90),
  (4, 'En proceso asesor',
   'La etapa está en curso y la acción pendiente depende del asesor; el asesor ajusta el avance entre 20 y 90 %.',
   'en_proceso', NULL, true, 20, 90),
  (5, 'En proceso Instituto',
   'La etapa está en curso y la resolución depende del instituto; el asesor ajusta el avance entre 20 y 90 %.',
   'en_proceso', NULL, true, 20, 90),
  (6, 'Finalizado',
   'La etapa concluyó; el avance se fija en 100 % y se registra la fecha de término.',
   'completado', 100, false, NULL, NULL),
  (7, 'Bloqueado',
   'La etapa está bloqueada (error de documentación u otro bloqueo institucional); el avance queda congelado y se registra el motivo.',
   'excepcion', NULL, false, NULL, NULL),
  (8, 'Cancelado',
   'La etapa fue cancelada; el avance queda congelado en el último valor.',
   'excepcion', NULL, false, NULL, NULL),
  (9, 'Detenido',
   'La etapa está detenida; el avance queda congelado en el último valor.',
   'excepcion', NULL, false, NULL, NULL);

INSERT INTO tipo_correccion (nombre) VALUES
  ('Corrección de CURP'),
  ('Corrección de RFC'),
  ('Corrección de Acta de Nacimiento'),
  ('Corrección de Nombre y/o Apellidos'),
  ('Corrección de Fecha o Lugar de Nacimiento'),
  ('Corrección de Sexo / Género'),
  ('Unificación de NSS (Duplicidad / Multiplicidad)'),
  ('Corrección de Datos en AFORE'),
  ('Regularización / Actualización de Datos ante IMSS (SINDO)'),
  ('Corrección de Domicilio'),
  ('Corrección de Clave de Elector (INE)'),
  ('Otro');

INSERT INTO estrategia_recomendada_tipo (nombre) VALUES
  ('Pensionarse sin cambios'),
  ('Solicitar recuperación/aclaración de semanas'),
  ('Corregir datos personales o NSS'),
  ('Inscribirse a Modalidad 10'),
  ('Inscribirse a Modalidad 40'),
  ('Inscribirse a Modalidad 40 con pago retroactivo'),
  ('Reingresar o regularizar Modalidad 40'),
  ('Esperar y seguir cotizando con patrón'),
  ('Estrategia mixta'),
  ('No se recomienda realizar aportación adicional'),
  ('Otro');

INSERT INTO objetivo_diagnostico (nombre) VALUES
  ('Pensionarse lo antes posible'),
  ('Maximizar pensión mensual'),
  ('Negativa de pensión'),
  ('Recuperar semanas no reconocidas'),
  ('Reactivar conservación de derechos'),
  ('Mejorar salario promedio'),
  ('Evaluar Modalidad 40'),
  ('Evaluar Modalidad 10 / trabajador independiente'),
  ('Evaluar pago retroactivo de Modalidad 40'),
  ('Regularizar historial IMSS'),
  ('Determinar si conviene seguir trabajando'),
  ('Otro');

INSERT INTO tipo_inconsistencia_detectada (nombre) VALUES
  ('Hay periodos laborados no reconocidos'),
  ('Hay duplicidad de NSS'),
  ('Hay homonimia o datos personales incorrectos'),
  ('Hay semanas descontadas sin explicación clara'),
  ('Hay periodos con salario menor al real'),
  ('Hay patrón desaparecido o sin registros completos'),
  ('Hay posible portabilidad ISSSTE-IMSS'),
  ('No se detectan inconsistencias relevantes'),
  ('Otro');

INSERT INTO tipo_gestion_recuperacion (nombre) VALUES
  ('Aclaración de semanas cotizadas ante IMSS'),
  ('Recuperación de semanas cotizadas ante PNT'),
  ('Corrección de datos personales'),
  ('Unificación de NSS'),
  ('Revisión de semanas descontadas'),
  ('Búsqueda de evidencia patronal'),
  ('Portabilidad ISSSTE-IMSS'),
  ('Otro');

INSERT INTO tipo_evidencia_recuperacion (nombre) VALUES
  ('Recibos de nómina'),
  ('Constancias laborales'),
  ('Hojas rosas / avisos afiliatorios'),
  ('Estados de cuenta AFORE / SAR'),
  ('Contratos laborales'),
  ('Credenciales o documentos del patrón'),
  ('Declaraciones fiscales o comprobantes de pago'),
  ('Otro');

-- objetivo_modalidad_10.id no es autoincremental: se asignan ids explícitos.
INSERT INTO objetivo_modalidad_10 (id, nombre) VALUES
  (1, 'Tener cobertura médica y prestaciones'),
  (2, 'Seguir generando semanas'),
  (3, 'Reactivar derechos'),
  (4, 'Mejorar continuidad de cotización'),
  (5, 'Evaluar transición posterior a Modalidad 40'),
  (6, 'Otro');

INSERT INTO objetivo_modalidad_40 (nombre) VALUES
  ('Aumentar salario promedio'),
  ('Completar semanas faltantes'),
  ('Mejorar pensión Ley 73'),
  ('Mantener cotización para pensión'),
  ('Reingresar tras baja por mora'),
  ('Otro');

-- Se conserva el orden del formulario F0; los ids son los autogenerados (1 a 12).
INSERT INTO objetivo_especifico_inicial (nombre) VALUES
  ('Corrección de datos personales'),
  ('Unificación de NSS'),
  ('Aclaración/Recuperación de Semanas'),
  ('Modalidad 10'),
  ('Modalidad 40'),
  ('Modalidad 40 retroactiva'),
  ('IMSS-ISSSTE/Portabilidad'),
  ('Unificación AFORE/cuentas'),
  ('SAR92/Recursos'),
  ('Solicitud de pensión'),
  ('Negativa de pensión/recuperación de recursos'),
  ('Juicio y jurisdicción');
