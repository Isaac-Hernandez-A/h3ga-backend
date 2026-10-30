-- Seguimiento por etapas, agenda y avisos.

CREATE TABLE etapas_tramite (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES clientes (id),
  etapa_id          SMALLINT NOT NULL REFERENCES etapas_proceso (id),
  estatus_id        SMALLINT NOT NULL REFERENCES estatus_tramite (id),
  avance_porcentaje SMALLINT NOT NULL DEFAULT 0,
  accion_a_realizar TEXT,
  fecha_compromiso  DATE,
  fecha_completada  DATE,
  reactivado_en     TIMESTAMPTZ,
  creado_el         TIMESTAMPTZ NOT NULL,
  actualizado_el    TIMESTAMPTZ NOT NULL,
  motivo_rechazo    TEXT,
  UNIQUE (cliente_id, etapa_id)
);

CREATE TABLE etapas_tramite_historial (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_tramite_id    UUID NOT NULL REFERENCES etapas_tramite (id),
  estatus_anterior_id SMALLINT REFERENCES estatus_tramite (id),
  estatus_nuevo_id    SMALLINT NOT NULL REFERENCES estatus_tramite (id),
  motivo_rechazo      TEXT,
  cambiado_por        UUID NOT NULL REFERENCES usuarios (id),
  fecha_cambio        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE eventos_agenda (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesor_id  UUID NOT NULL REFERENCES usuarios (id),
  cliente_id UUID NOT NULL REFERENCES clientes (id),
  fecha      DATE NOT NULL,
  hora       TIME NOT NULL,
  motivo     TEXT NOT NULL,
  estatus    estatus_evento_agenda NOT NULL
);

CREATE TABLE avisos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             tipo_aviso NOT NULL,
  etapa_tramite_id UUID REFERENCES etapas_tramite (id),
  evento_id        UUID REFERENCES eventos_agenda (id),
  fecha_alerta     TIMESTAMPTZ NOT NULL,
  atendido         BOOLEAN NOT NULL DEFAULT false,
  atendido_por     UUID REFERENCES usuarios (id),
  fecha_atencion   TIMESTAMPTZ,
  CHECK ((etapa_tramite_id IS NOT NULL) <> (evento_id IS NOT NULL))
);
