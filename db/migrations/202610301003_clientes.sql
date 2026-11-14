-- Clientes, sus documentos y auxiliares asignados.

CREATE TABLE clientes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                      TEXT NOT NULL,
  apellido_paterno            TEXT NOT NULL,
  apellido_materno            TEXT NOT NULL,
  referido_por                TEXT NOT NULL,
  telefono                    TEXT NOT NULL,
  asesor_id                   UUID NOT NULL REFERENCES usuarios (id),
  fecha_ingreso               DATE NOT NULL,
  correo_electronico          TEXT NOT NULL,
  curp                        VARCHAR(18) UNIQUE,
  rfc                         VARCHAR(13),
  fecha_nacimiento            DATE NOT NULL,
  estado_civil                estado_civil NOT NULL,
  dependientes_economicos     INTEGER NOT NULL,
  regimen_id                  SMALLINT NOT NULL REFERENCES regimen_principal (id),
  nss                         VARCHAR(11),
  ley_probable_id             SMALLINT NOT NULL REFERENCES ley_probable (id),
  semanas_imss_reconocidas    INTEGER NOT NULL,
  semanas_a_recuperar         INTEGER,
  tiene_issste                estado_confirmacion NOT NULL,
  afore_id                    SMALLINT NOT NULL REFERENCES afore (id),
  observaciones_generales     TEXT NOT NULL,
  requiere_contadora          estado_confirmacion NOT NULL,
  sexo                        sexo_cliente NOT NULL,
  ocupacion                   TEXT,
  domicilio                   TEXT NOT NULL,
  estado                      TEXT NOT NULL,
  subdelegacion_imss_probable TEXT NOT NULL,
  cambio_afore                estado_confirmacion NOT NULL,
  ine                         VARCHAR(18),
  objetivo_cliente            objetivo_cliente NOT NULL
);

CREATE TABLE documentos_clientes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id              UUID NOT NULL REFERENCES clientes (id),
  tipo_documento_id       SMALLINT NOT NULL REFERENCES tipo_documento (id),
  archivo_path            TEXT NOT NULL,
  nombre_archivo_original TEXT NOT NULL,
  mime_type               TEXT NOT NULL,
  estatus                 estado_confirmacion NOT NULL,
  numero_referencia       TEXT,
  fecha_carga             TIMESTAMPTZ NOT NULL,
  subido_por              UUID NOT NULL REFERENCES usuarios (id),
  observaciones           TEXT
);

-- autorizado_por y fecha_autorizacion son NOT NULL por RF-41 (guardar quién autorizó y cuándo).
-- Desviación deliberada y confirmada: el diccionario los marca NULLABLE.
CREATE TABLE cliente_auxiliares (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id         UUID NOT NULL REFERENCES clientes (id),
  auxiliar_id        UUID NOT NULL REFERENCES usuarios (id),
  autorizado_por     UUID NOT NULL REFERENCES usuarios (id),
  fecha_autorizacion TIMESTAMPTZ NOT NULL,
  activo             BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (cliente_id, auxiliar_id)
);
