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

-- ============================================================================
--  Pedidos confirmados fuera de rango publicados para el portal.
--  El aplicativo publica, por domiciliario y período, la lista de pedidos
--  confirmados cuyo punto de entrega quedó fuera de rango.
-- ============================================================================
CREATE TABLE IF NOT EXISTS fuera_rango_publicados (
    id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    documento         varchar(30)   NOT NULL,   -- cédula/documento del domiciliario
    codigo_vehiculo   varchar(50)   NOT NULL,   -- placa/código asignado
    nombre            varchar(200)  NOT NULL,
    pdv               varchar(120),
    periodo_etiqueta  varchar(120)  NOT NULL,   -- ej. "Agosto 2026 · Quincena 1"
    rango_fechas      varchar(120)  NOT NULL,
    fecha_desde       date          NOT NULL,
    fecha_hasta       date          NOT NULL,
    total             integer       NOT NULL DEFAULT 0,  -- cantidad de pedidos fuera de rango
    -- Array JSON de filas: [{ "fecha", "nombreCliente", "distanciaConfirmada" }, ...]
    detalle           jsonb         NOT NULL,
    publicado_en      timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT ux_frpub UNIQUE (documento, codigo_vehiculo, fecha_desde, fecha_hasta)
);

CREATE INDEX IF NOT EXISTS ix_frpub_doc ON fuera_rango_publicados (documento);

-- ============================================================================
--  Fletes registrados por el domiciliario (módulo "Registrar flete").
--  Cada domiciliario habilitado registra los fletes que realiza.
-- ============================================================================
-- Secuencia para el consecutivo global de trazabilidad (FLE-000001).
CREATE SEQUENCE IF NOT EXISTS fletes_consecutivo_seq;

CREATE TABLE IF NOT EXISTS fletes_registrados (
    id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    documento        varchar(30)   NOT NULL,   -- documento del domiciliario
    codigo_vehiculo  varchar(50)   NOT NULL,   -- placa/código asignado
    fecha            date          NOT NULL,   -- fecha del flete
    origen           varchar(200)  NOT NULL,
    destino          varchar(200)  NOT NULL,
    descripcion      text          NOT NULL,   -- detalle del servicio
    kilos            numeric(12,2) NOT NULL DEFAULT 0,  -- kilos enviados
    origen_lat       numeric(9,6),             -- geolocalización de origen
    origen_lng       numeric(9,6),
    destino_lat      numeric(9,6),             -- geolocalización de destino
    destino_lng      numeric(9,6),
    kilometros       numeric(10,2),            -- distancia calculada origen→destino
    completado       boolean       NOT NULL DEFAULT false,  -- flete terminado
    enviado          boolean       NOT NULL DEFAULT false,  -- enviado a liquidación
    enviado_en       timestamptz,
    consecutivo      bigint        NOT NULL DEFAULT nextval('fletes_consecutivo_seq'),  -- trazabilidad global (FLE-000001)
    numero           integer,                  -- número de flete del domiciliario (1, 2, 3, …)
    creado_en        timestamptz   NOT NULL DEFAULT now()
);

-- Columnas de geolocalización (migración para tablas ya existentes).
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS origen_lat  numeric(9,6);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS origen_lng  numeric(9,6);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS destino_lat numeric(9,6);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS destino_lng numeric(9,6);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS kilometros  numeric(10,2);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS completado  boolean NOT NULL DEFAULT false;

-- Envío a liquidación: el flete completado se envía a la app de liquidación.
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS enviado     boolean NOT NULL DEFAULT false;
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS enviado_en  timestamptz;

-- Campos que digita el liquidador en la app de escritorio.
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS ruta              varchar(20);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS flete_consolidado numeric(14,2);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS flete             numeric(14,2);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS liquidado         boolean NOT NULL DEFAULT false;

-- Consecutivo global (trazabilidad) y número por domiciliario.
ALTER TABLE fletes_registrados
    ADD COLUMN IF NOT EXISTS consecutivo bigint NOT NULL DEFAULT nextval('fletes_consecutivo_seq');
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS numero integer;

-- Backfill del número por domiciliario para filas existentes sin número.
WITH ord AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY documento, codigo_vehiculo ORDER BY consecutivo) AS rn
      FROM fletes_registrados
     WHERE numero IS NULL
)
UPDATE fletes_registrados f
   SET numero = ord.rn
  FROM ord
 WHERE f.id = ord.id;

-- Consulta de fletes por domiciliario.
CREATE INDEX IF NOT EXISTS ix_fletes_doc_cod
    ON fletes_registrados (documento, codigo_vehiculo);

-- ============================================================================
--  Puntos de referencia (origen/destino) para el registro de fletes.
--  Los administra la app de escritorio (módulo "Modificar Puntos Referencia")
--  y los consume el portal web al registrar un flete.
-- ============================================================================
CREATE TABLE IF NOT EXISTS puntos_referencia_flete (
    id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    documento        varchar(30)   NOT NULL,   -- documento del domiciliario
    codigo_vehiculo  varchar(50)   NOT NULL,   -- placa/código asignado
    descripcion      varchar(200)  NOT NULL,   -- nombre del punto (ej. "Pdv Concord")
    aplica_origen    boolean       NOT NULL DEFAULT true,
    aplica_destino   boolean       NOT NULL DEFAULT true,
    creado_en        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_puntosref_doc_cod
    ON puntos_referencia_flete (documento, codigo_vehiculo);

-- Siembra los puntos que antes eran fijos en el portal, solo si el domiciliario no tiene ninguno aún.
INSERT INTO puntos_referencia_flete (documento, codigo_vehiculo, descripcion, aplica_origen, aplica_destino)
SELECT '1081026787', 'LZR889', d.descripcion, true, true
  FROM (VALUES
        ('Pdv La 70'), ('Pdv Malambo'), ('Mangonizate'), ('Oficina Carnes Santacruz'),
        ('Pdv Concord'), ('Agropecuaria'), ('Pdv Alameda 1'), ('Pdv San Felipe'),
        ('Pdv Simon'), ('Pdv La 93'), ('Pdv Alameda 2'), ('Restaurante La 43'),
        ('Pdv Centro'), ('Salsamentaria'), ('Pdv La 43'), ('Restaurante Malambo')
       ) AS d(descripcion)
 WHERE NOT EXISTS (
        SELECT 1 FROM puntos_referencia_flete
         WHERE documento = '1081026787' AND codigo_vehiculo = 'LZR889'
       );

-- ============================================================================
--  Geolocalización enriquecida: dirección, barrio, ciudad y establecimiento
--  (reverse geocoding con Nominatim/OpenStreetMap) y geometría de la ruta por
--  carretera (OSRM). Se calcula en el portal al guardar la ubicación del flete.
-- ============================================================================
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS origen_direccion        text;
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS origen_barrio           varchar(150);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS origen_ciudad           varchar(150);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS origen_establecimiento  varchar(200);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS destino_direccion       text;
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS destino_barrio          varchar(150);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS destino_ciudad          varchar(150);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS destino_establecimiento varchar(200);
-- Polyline (formato encoded polyline de OSRM) de la ruta origen→destino, para dibujarla en el mapa.
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS ruta_geometria          text;

-- La tabla de puntos de referencia también guarda la ubicación y dirección resuelta.
ALTER TABLE puntos_referencia_flete ADD COLUMN IF NOT EXISTS lat             numeric(9,6);
ALTER TABLE puntos_referencia_flete ADD COLUMN IF NOT EXISTS lng             numeric(9,6);
ALTER TABLE puntos_referencia_flete ADD COLUMN IF NOT EXISTS direccion       text;
ALTER TABLE puntos_referencia_flete ADD COLUMN IF NOT EXISTS barrio          varchar(150);
ALTER TABLE puntos_referencia_flete ADD COLUMN IF NOT EXISTS ciudad          varchar(150);
ALTER TABLE puntos_referencia_flete ADD COLUMN IF NOT EXISTS establecimiento varchar(200);

-- ============================================================================
--  Paradas del flete: un flete es una ruta ordenada de puntos (origen →
--  intermedios → destino). Sustituye al par origen/destino fijo. El par de
--  columnas origen/destino de fletes_registrados se mantiene (primera/última
--  parada) por compatibilidad con la app de liquidación.
-- ============================================================================
CREATE TABLE IF NOT EXISTS flete_paradas (
    id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    flete_id         uuid          NOT NULL REFERENCES fletes_registrados(id) ON DELETE CASCADE,
    orden            integer       NOT NULL,               -- 0 = origen, N = destino
    tipo             varchar(12)   NOT NULL DEFAULT 'intermedio',  -- origen | intermedio | destino
    descripcion      varchar(200)  NOT NULL,
    lat              numeric(9,6),
    lng              numeric(9,6),
    direccion        text,
    barrio           varchar(150),
    ciudad           varchar(150),
    establecimiento  varchar(200),
    km_tramo         numeric(10,2),   -- km del tramo anterior a esta parada (por carretera)
    hora_llegada     timestamptz,     -- fase B: seguimiento en vivo
    hora_salida      timestamptz,
    creado_en        timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT ux_flete_paradas_orden UNIQUE (flete_id, orden)
);

CREATE INDEX IF NOT EXISTS ix_flete_paradas_flete ON flete_paradas (flete_id);

-- Carga por parada: qué se entrega y cuántos kilos en cada punto (el origen es recogida).
ALTER TABLE flete_paradas ADD COLUMN IF NOT EXISTS carga_descripcion text;
ALTER TABLE flete_paradas ADD COLUMN IF NOT EXISTS carga_kilos       numeric(12,2);

-- Tiempos y totales del flete (fases B/C: navegación en vivo y analítica).
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS iniciado_en   timestamptz;  -- "Iniciar flete"
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS finalizado_en timestamptz;  -- flete terminado
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS duracion_seg  integer;      -- duración total en segundos
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS paradas_count integer;      -- número de paradas de la ruta

-- Navegación en vivo (fase B): estado del viaje, parada objetivo y última posición conocida.
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS estado_viaje  varchar(12) NOT NULL DEFAULT 'planeado'; -- planeado | en_curso | finalizado
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS parada_actual integer;      -- índice de la próxima parada a alcanzar
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS pos_lat       numeric(9,6); -- última posición del conductor
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS pos_lng       numeric(9,6);
ALTER TABLE fletes_registrados ADD COLUMN IF NOT EXISTS pos_en        timestamptz;

-- Índice para que la oficina liste rápidamente los fletes en curso.
CREATE INDEX IF NOT EXISTS ix_fletes_estado_viaje ON fletes_registrados (estado_viaje);

