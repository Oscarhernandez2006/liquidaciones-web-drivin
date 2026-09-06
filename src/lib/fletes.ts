import { obtenerPool } from "@/lib/db";
import type { Flete, FleteEntrada } from "@/lib/tipos";

/** Convierte un valor a número finito o null (coordenadas/km opcionales). */
export function numOpcional(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Columnas que se leen/retornan de fletes_registrados (para mapearFila).
const COLS_FLETE = `id, consecutivo, numero, fecha, origen, destino, descripcion, kilos,
            origen_lat, origen_lng, destino_lat, destino_lng, kilometros,
            origen_direccion, origen_barrio, origen_ciudad, origen_establecimiento,
            destino_direccion, destino_barrio, destino_ciudad, destino_establecimiento,
            ruta_geometria, estado_viaje, paradas_count, completado, creado_en`;

function mapearFila(r: {
  id: unknown;
  consecutivo: unknown;
  numero: unknown;
  fecha: unknown;
  origen: string;
  destino: string;
  descripcion: string;
  kilos: unknown;
  origen_lat: unknown;
  origen_lng: unknown;
  destino_lat: unknown;
  destino_lng: unknown;
  kilometros: unknown;
  origen_direccion: unknown;
  origen_barrio: unknown;
  origen_ciudad: unknown;
  origen_establecimiento: unknown;
  destino_direccion: unknown;
  destino_barrio: unknown;
  destino_ciudad: unknown;
  destino_establecimiento: unknown;
  ruta_geometria: unknown;
  estado_viaje: unknown;
  paradas_count: unknown;
  completado: unknown;
  creado_en: unknown;
}): Flete {
  const fecha = r.fecha instanceof Date ? r.fecha.toISOString().slice(0, 10) : String(r.fecha);
  const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
  const txt = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
  const consecutivo = Number(r.consecutivo);
  return {
    id: String(r.id),
    consecutivo,
    codigo: `FLE-${String(consecutivo).padStart(6, "0")}`,
    numero: r.numero === null || r.numero === undefined ? 0 : Number(r.numero),
    fecha,
    origen: r.origen,
    destino: r.destino,
    descripcion: r.descripcion,
    kilos: Number(r.kilos),
    origenLat: num(r.origen_lat),
    origenLng: num(r.origen_lng),
    destinoLat: num(r.destino_lat),
    destinoLng: num(r.destino_lng),
    kilometros: num(r.kilometros),
    origenDireccion: txt(r.origen_direccion),
    origenBarrio: txt(r.origen_barrio),
    origenCiudad: txt(r.origen_ciudad),
    origenEstablecimiento: txt(r.origen_establecimiento),
    destinoDireccion: txt(r.destino_direccion),
    destinoBarrio: txt(r.destino_barrio),
    destinoCiudad: txt(r.destino_ciudad),
    destinoEstablecimiento: txt(r.destino_establecimiento),
    rutaGeometria: txt(r.ruta_geometria),
    estadoViaje: (txt(r.estado_viaje) ?? "planeado") as Flete["estadoViaje"],
    paradasCount: num(r.paradas_count),
    completado: Boolean(r.completado),
    creadoEn: r.creado_en instanceof Date ? r.creado_en.toISOString() : String(r.creado_en),
  };
}

/** Lista los fletes de un domiciliario, del más reciente al más antiguo. */
export async function listarFletes(
  documento: string,
  codigoVehiculo: string
): Promise<Flete[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT ${COLS_FLETE}
       FROM fletes_registrados
      WHERE documento = $1 AND codigo_vehiculo = $2 AND enviado = false
      ORDER BY fecha DESC, creado_en DESC`,
    [documento, codigoVehiculo]
  );
  return rows.map(mapearFila);
}

/** Registra un nuevo flete y devuelve el registro creado. */
export async function crearFlete(
  documento: string,
  codigoVehiculo: string,
  entrada: FleteEntrada
): Promise<Flete> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `INSERT INTO fletes_registrados
        (documento, codigo_vehiculo, fecha, origen, destino, descripcion, kilos,
         origen_lat, origen_lng, destino_lat, destino_lng, kilometros, completado, numero)
     VALUES ($1::varchar, $2::varchar, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         (SELECT COALESCE(MAX(numero), 0) + 1 FROM fletes_registrados
           WHERE documento = $1 AND codigo_vehiculo = $2))
     RETURNING ${COLS_FLETE}`,
    [
      documento,
      codigoVehiculo,
      entrada.fecha,
      entrada.origen,
      entrada.destino,
      entrada.descripcion,
      entrada.kilos,
      entrada.origenLat,
      entrada.origenLng,
      entrada.destinoLat,
      entrada.destinoLng,
      entrada.kilometros,
      entrada.completado,
    ]
  );
  return mapearFila(rows[0]);
}

/** Actualiza un flete del domiciliario. Devuelve el registro o null si no existe/no le pertenece. */
export async function actualizarFlete(
  id: string,
  documento: string,
  codigoVehiculo: string,
  entrada: FleteEntrada
): Promise<Flete | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `UPDATE fletes_registrados
        SET fecha = $4, origen = $5, destino = $6, descripcion = $7, kilos = $8,
            origen_lat = $9, origen_lng = $10, destino_lat = $11, destino_lng = $12,
            kilometros = $13, completado = $14
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3
     RETURNING ${COLS_FLETE}`,
    [
      id,
      documento,
      codigoVehiculo,
      entrada.fecha,
      entrada.origen,
      entrada.destino,
      entrada.descripcion,
      entrada.kilos,
      entrada.origenLat,
      entrada.origenLng,
      entrada.destinoLat,
      entrada.destinoLng,
      entrada.kilometros,
      entrada.completado,
    ]
  );
  return rows.length ? mapearFila(rows[0]) : null;
}

/** Datos de ubicación resuelta que se guardan al capturar/geocodificar un flete. */
export interface UbicacionFlete {
  origenLat: number | null;
  origenLng: number | null;
  destinoLat: number | null;
  destinoLng: number | null;
  kilometros: number | null;
  origenDireccion: string | null;
  origenBarrio: string | null;
  origenCiudad: string | null;
  origenEstablecimiento: string | null;
  destinoDireccion: string | null;
  destinoBarrio: string | null;
  destinoCiudad: string | null;
  destinoEstablecimiento: string | null;
  rutaGeometria: string | null;
  completado: boolean;
}

/** Guarda coordenadas, km por ruta, geometría y dirección resuelta de un flete. */
export async function guardarUbicacionFlete(
  id: string,
  documento: string,
  codigoVehiculo: string,
  u: UbicacionFlete
): Promise<Flete | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `UPDATE fletes_registrados
        SET origen_lat = $4, origen_lng = $5, destino_lat = $6, destino_lng = $7,
            kilometros = $8,
            origen_direccion = $9, origen_barrio = $10, origen_ciudad = $11, origen_establecimiento = $12,
            destino_direccion = $13, destino_barrio = $14, destino_ciudad = $15, destino_establecimiento = $16,
            ruta_geometria = $17, completado = $18
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3
     RETURNING ${COLS_FLETE}`,
    [
      id,
      documento,
      codigoVehiculo,
      u.origenLat,
      u.origenLng,
      u.destinoLat,
      u.destinoLng,
      u.kilometros,
      u.origenDireccion,
      u.origenBarrio,
      u.origenCiudad,
      u.origenEstablecimiento,
      u.destinoDireccion,
      u.destinoBarrio,
      u.destinoCiudad,
      u.destinoEstablecimiento,
      u.rutaGeometria,
      u.completado,
    ]
  );
  return rows.length ? mapearFila(rows[0]) : null;
}

/** Actualiza metadatos de ruta del flete (número de paradas). */
export async function actualizarMetaFlete(id: string, paradasCount: number | null): Promise<void> {
  const pool = obtenerPool();
  await pool.query(`UPDATE fletes_registrados SET paradas_count = $2 WHERE id = $1`, [id, paradasCount]);
}

/** Elimina un flete del domiciliario. Devuelve true si se eliminó. */
export async function eliminarFlete(
  id: string,
  documento: string,
  codigoVehiculo: string
): Promise<boolean> {
  const pool = obtenerPool();
  const { rowCount } = await pool.query(
    `DELETE FROM fletes_registrados
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3`,
    [id, documento, codigoVehiculo]
  );
  return (rowCount ?? 0) > 0;
}

/** Envía a liquidación los fletes completados (aún no enviados) y devuelve los enviados. */
export async function enviarFletes(
  documento: string,
  codigoVehiculo: string
): Promise<Flete[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `UPDATE fletes_registrados
        SET enviado = true, enviado_en = now()
      WHERE documento = $1 AND codigo_vehiculo = $2
        AND completado = true AND enviado = false
     RETURNING ${COLS_FLETE}`,
    [documento, codigoVehiculo]
  );
  return rows.map(mapearFila);
}
