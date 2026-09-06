import { obtenerPool } from "@/lib/db";
import { listarParadas, type Parada } from "@/lib/paradas";

/** Estado de navegación de un flete (para la pantalla del conductor y la oficina). */
export interface EstadoSeguimiento {
  id: string;
  origen: string;
  destino: string;
  estadoViaje: "planeado" | "en_curso" | "finalizado";
  paradaActual: number | null;
  posLat: number | null;
  posLng: number | null;
  posEn: string | null;
  iniciadoEn: string | null;
  finalizadoEn: string | null;
  duracionSeg: number | null;
  kilometros: number | null;
  rutaGeometria: string | null;
}

export interface Seguimiento {
  estado: EstadoSeguimiento | null;
  paradas: Parada[];
}

function iso(v: unknown): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}
function num(v: unknown): number | null {
  return v == null ? null : Number(v);
}

async function leerEstado(id: string): Promise<EstadoSeguimiento | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT id, origen, destino, estado_viaje, parada_actual, pos_lat, pos_lng, pos_en,
            iniciado_en, finalizado_en, duracion_seg, kilometros, ruta_geometria
       FROM fletes_registrados WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: String(r.id),
    origen: r.origen,
    destino: r.destino,
    estadoViaje: (r.estado_viaje ?? "planeado") as EstadoSeguimiento["estadoViaje"],
    paradaActual: num(r.parada_actual),
    posLat: num(r.pos_lat),
    posLng: num(r.pos_lng),
    posEn: iso(r.pos_en),
    iniciadoEn: iso(r.iniciado_en),
    finalizadoEn: iso(r.finalizado_en),
    duracionSeg: num(r.duracion_seg),
    kilometros: num(r.kilometros),
    rutaGeometria: r.ruta_geometria ?? null,
  };
}

/** Estado + paradas de un flete. */
export async function obtenerSeguimiento(id: string): Promise<Seguimiento> {
  const [estado, paradas] = await Promise.all([leerEstado(id), listarParadas(id)]);
  return { estado, paradas };
}

/** Inicia el viaje: marca en curso, sella la salida del origen y apunta a la parada 1. */
export async function iniciarFlete(id: string, documento: string, codigoVehiculo: string): Promise<Seguimiento> {
  const pool = obtenerPool();
  await pool.query(
    `UPDATE fletes_registrados
        SET estado_viaje = 'en_curso', iniciado_en = now(), parada_actual = 1
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3 AND estado_viaje <> 'finalizado'`,
    [id, documento, codigoVehiculo]
  );
  await pool.query(
    `UPDATE flete_paradas SET hora_salida = now() WHERE flete_id = $1 AND orden = 0`,
    [id]
  );
  return obtenerSeguimiento(id);
}

/** Guarda la última posición del conductor (llamado periódicamente durante el viaje). */
export async function guardarPosicion(
  id: string,
  documento: string,
  codigoVehiculo: string,
  lat: number,
  lng: number
): Promise<void> {
  const pool = obtenerPool();
  await pool.query(
    `UPDATE fletes_registrados
        SET pos_lat = $4, pos_lng = $5, pos_en = now()
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3 AND estado_viaje = 'en_curso'`,
    [id, documento, codigoVehiculo, lat, lng]
  );
}

/** Registra la llegada a una parada intermedia y avanza a la siguiente. */
export async function registrarLlegada(
  id: string,
  documento: string,
  codigoVehiculo: string,
  orden: number
): Promise<Seguimiento> {
  const pool = obtenerPool();
  await pool.query(
    `UPDATE flete_paradas SET hora_llegada = COALESCE(hora_llegada, now())
      WHERE flete_id = $1 AND orden = $2`,
    [id, orden]
  );
  await pool.query(
    `UPDATE fletes_registrados SET parada_actual = $4
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3 AND estado_viaje = 'en_curso'`,
    [id, documento, codigoVehiculo, orden + 1]
  );
  return obtenerSeguimiento(id);
}

/** Finaliza el viaje: sella la llegada al destino, la duración total y marca terminado. */
export async function finalizarFlete(id: string, documento: string, codigoVehiculo: string): Promise<Seguimiento> {
  const pool = obtenerPool();
  await pool.query(
    `UPDATE flete_paradas SET hora_llegada = COALESCE(hora_llegada, now())
      WHERE flete_id = $1 AND orden = (SELECT MAX(orden) FROM flete_paradas WHERE flete_id = $1)`,
    [id]
  );
  await pool.query(
    `UPDATE fletes_registrados
        SET estado_viaje = 'finalizado', finalizado_en = now(), completado = true,
            duracion_seg = GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(iniciado_en, now())))::int)
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3`,
    [id, documento, codigoVehiculo]
  );
  return obtenerSeguimiento(id);
}
