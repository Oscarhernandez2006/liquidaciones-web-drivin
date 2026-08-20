-- ============================================================================
--  Tabla de liquidaciones publicadas para el portal de domiciliarios.
--  El aplicativo de escritorio (WPF) inserta aquí cada liquidación que "publica".
--  El portal web la consulta por documento + código de vehículo.
-- ============================================================================

-- Para gen_random_uuid() en PostgreSQL < 13 (en 13+ ya viene en el core).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS liquidaciones_publicadas (
    id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    documento         varchar(30)   NOT NULL,   -- cédula/documento del domiciliario
    codigo_vehiculo   varchar(50)   NOT NULL,   -- placa/código asignado
    nombre            varchar(200)  NOT NULL,
    pdv               varchar(120),
    periodo_etiqueta  varchar(120)  NOT NULL,   -- ej. "Agosto 2026 · Quincena 1"
    rango_fechas      varchar(120)  NOT NULL,   -- ej. "2026-08-01 a 2026-08-15"
    fecha_desde       date          NOT NULL,
    fecha_hasta       date          NOT NULL,
    cumple            boolean       NOT NULL DEFAULT true,
    estado_cumple     varchar(60)   NOT NULL DEFAULT 'CUMPLE',
    -- Detalle completo de la fila de liquidación (conceptos + métricas + total).
    detalle           jsonb         NOT NULL,
    total             numeric(14,2) NOT NULL,
    publicado_en      timestamptz   NOT NULL DEFAULT now(),
    -- Una liquidación por domiciliario y período.
    CONSTRAINT ux_liqpub UNIQUE (documento, codigo_vehiculo, fecha_desde, fecha_hasta)
);

-- Búsqueda del portal: documento + código de vehículo.
CREATE INDEX IF NOT EXISTS ix_liqpub_doc_cod
    ON liquidaciones_publicadas (documento, codigo_vehiculo);

-- Estructura esperada de la columna `detalle` (JSONB):
-- {
--   "domiciliario":   "Juan Pérez",
--   "pedidos":        120,
--   "runErrands":     8,
--   "fueraRango":     3,
--   "noConfirmados":  1,
--   "kilometros":     742.5,
--   "gasolina":       120000,      // null = "No aplica"
--   "rodamiento":     80000,
--   "usoCelular":     30000,
--   "runErrandsMonto":40000,
--   "variablePedido": 210000,
--   "variableKm":     95000,
--   "total":          575000
-- }
