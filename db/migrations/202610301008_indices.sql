-- Índices en llaves foráneas (PostgreSQL no los crea solo) y en fechas de consulta frecuente.
-- Se omiten las FK que ya son la primera columna de una PK o UNIQUE.

-- Llaves foráneas
CREATE INDEX idx_usuarios_rol_id ON usuarios (rol_id);
CREATE INDEX idx_usuarios_tipo_asesor_id ON usuarios (tipo_asesor_id);

CREATE INDEX idx_clientes_asesor_id ON clientes (asesor_id);
CREATE INDEX idx_clientes_regimen_id ON clientes (regimen_id);
CREATE INDEX idx_clientes_ley_probable_id ON clientes (ley_probable_id);
CREATE INDEX idx_clientes_afore_id ON clientes (afore_id);

CREATE INDEX idx_documentos_clientes_cliente_id ON documentos_clientes (cliente_id);
CREATE INDEX idx_documentos_clientes_tipo_documento_id ON documentos_clientes (tipo_documento_id);
CREATE INDEX idx_documentos_clientes_subido_por ON documentos_clientes (subido_por);

CREATE INDEX idx_cliente_auxiliares_auxiliar_id ON cliente_auxiliares (auxiliar_id);
CREATE INDEX idx_cliente_auxiliares_autorizado_por ON cliente_auxiliares (autorizado_por);

CREATE INDEX idx_etapas_tramite_etapa_id ON etapas_tramite (etapa_id);
CREATE INDEX idx_etapas_tramite_estatus_id ON etapas_tramite (estatus_id);

CREATE INDEX idx_etapas_tramite_historial_etapa_tramite_id ON etapas_tramite_historial (etapa_tramite_id);
CREATE INDEX idx_etapas_tramite_historial_estatus_anterior_id ON etapas_tramite_historial (estatus_anterior_id);
CREATE INDEX idx_etapas_tramite_historial_estatus_nuevo_id ON etapas_tramite_historial (estatus_nuevo_id);
CREATE INDEX idx_etapas_tramite_historial_cambiado_por ON etapas_tramite_historial (cambiado_por);

CREATE INDEX idx_eventos_agenda_asesor_id ON eventos_agenda (asesor_id);
CREATE INDEX idx_eventos_agenda_cliente_id ON eventos_agenda (cliente_id);

CREATE INDEX idx_avisos_etapa_tramite_id ON avisos (etapa_tramite_id);
CREATE INDEX idx_avisos_evento_id ON avisos (evento_id);
CREATE INDEX idx_avisos_atendido_por ON avisos (atendido_por);

CREATE INDEX idx_correcciones_cliente_cliente_id ON correcciones_cliente (cliente_id);
CREATE INDEX idx_correcciones_cliente_tipo_correccion_id ON correcciones_cliente (tipo_correccion_id);
CREATE INDEX idx_unificacion_nss_secundarios_unificacion_id ON unificacion_nss_secundarios (unificacion_id);
CREATE INDEX idx_cliente_objetivos_especificos_objetivo_id ON cliente_objetivos_especificos (objetivo_id);

CREATE INDEX idx_diagnostico_especializado_asesor_id ON diagnostico_especializado (asesor_id);
CREATE INDEX idx_diagnostico_estrategias_recomendadas_estrategia_id ON diagnostico_estrategias_recomendadas (estrategia_id);
CREATE INDEX idx_diagnostico_objetivos_objetivo_id ON diagnostico_objetivos (objetivo_id);
CREATE INDEX idx_diagnostico_inconsistencias_generales_tipo_id ON diagnostico_inconsistencias_generales (tipo_id);
CREATE INDEX idx_recuperacion_gestiones_tipo_gestion_id ON recuperacion_gestiones (tipo_gestion_id);
CREATE INDEX idx_recuperacion_evidencias_tipo_evidencia_id ON recuperacion_evidencias (tipo_evidencia_id);
CREATE INDEX idx_diagnostico_objetivos_m10_objetivo_id ON diagnostico_objetivos_m10 (objetivo_id);
CREATE INDEX idx_modalidad10_criterios_diagnostico_id ON modalidad10_criterios (diagnostico_id);
CREATE INDEX idx_diagnostico_objetivos_m40_objetivo_id ON diagnostico_objetivos_m40 (objetivo_id);
CREATE INDEX idx_modalidad40_criterios_diagnostico_id ON modalidad40_criterios (diagnostico_id);
CREATE INDEX idx_retroactivo_evaluacion_conveniencia_retroactivo_id ON retroactivo_evaluacion_conveniencia (retroactivo_id);
CREATE INDEX idx_escenario_pension_diagnostico_f1_id ON escenario_pension (diagnostico_f1_id);
CREATE INDEX idx_periodos_inconsistencias_cliente_id ON periodos_inconsistencias (cliente_id);
CREATE INDEX idx_plan_accion_diagnostico_id ON plan_accion (diagnostico_id);
CREATE INDEX idx_situacion_patrimonial_hijos_situacion_patrimonial_id ON situacion_patrimonial_hijos (situacion_patrimonial_id);

-- Fechas usadas para filtrar, ordenar y generar avisos
CREATE INDEX idx_clientes_fecha_ingreso ON clientes (fecha_ingreso);
CREATE INDEX idx_documentos_clientes_fecha_carga ON documentos_clientes (fecha_carga);
CREATE INDEX idx_etapas_tramite_fecha_compromiso ON etapas_tramite (fecha_compromiso);
CREATE INDEX idx_etapas_tramite_historial_fecha_cambio ON etapas_tramite_historial (fecha_cambio);
CREATE INDEX idx_eventos_agenda_fecha ON eventos_agenda (fecha);
CREATE INDEX idx_avisos_fecha_alerta ON avisos (fecha_alerta);
CREATE INDEX idx_diagnostico_especializado_fecha_analisis ON diagnostico_especializado (fecha_analisis);
CREATE INDEX idx_plan_accion_fecha_objetivo ON plan_accion (fecha_objetivo);
