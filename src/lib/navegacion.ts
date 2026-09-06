import { obtenerPool } from "@/lib/db";
import { listarParadas, type Parada } from "@/lib/paradas";
import { reverseGeocode, rutaOSRMMulti } from "@/lib/geo";
import { enriquecerPuntoReferencia } from "@/lib/puntosReferencia";

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

/** Fija la ubicación real de una parada (capturada por GPS) y resuelve su dirección. */
async function fijarParada(fleteId: string, orden: number, lat: number, lng: number): Promise<void> {
  const pool = obtenerPool();
  const geo = await reverseGeocode(lat, lng);
  await pool.query(
    `UPDATE flete_paradas
        SET lat = $3, lng = $4, direccion = $5, barrio = $6, ciudad = $7, establecimiento = $8
      WHERE flete_id = $1 AND orden = $2`,
    [fleteId, orden, lat, lng, geo.direccion, geo.barrio, geo.ciudad, geo.establecimiento]
  );
}

/**
 * Inicia el viaje: marca en curso, sella la salida del origen y apunta a la parada 1.
 * Si viene la posición del conductor, se toma como ubicación real del origen.
 */
export async function iniciarFlete(
  id: string,
  documento: string,
  codigoVehiculo: string,
  lat?: number | null,
  lng?: number | null
): Promise<Seguimiento> {
  const pool = obtenerPool();
  await pool.query(
    `UPDATE fletes_registrados
        SET estado_viaje = 'en_curso', iniciado_en = now(), parada_actual = 1
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3 AND estado_viaje <> 'finalizado'`,
    [id, documento, codigoVehiculo]
  );
  await pool.query(`UPDATE flete_paradas SET hora_salida = now() WHERE flete_id = $1 AND orden = 0`, [id]);

  if (lat != null && lng != null) {
    await fijarParada(id, 0, lat, lng);
    await pool.query(
      `UPDATE fletes_registrados SET origen_lat = $2, origen_lng = $3, pos_lat = $2, pos_lng = $3, pos_en = now() WHERE id = $1`,
      [id, lat, lng]
    );
  }
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

/** Registra la llegada a una parada y avanza a la siguiente. La posición del conductor fija esa parada. */
export async function registrarLlegada(
  id: string,
  documento: string,
  codigoVehiculo: string,
  orden: number,
  lat?: number | null,
  lng?: number | null
): Promise<Seguimiento> {
  const pool = obtenerPool();
  await pool.query(
    `UPDATE flete_paradas SET hora_llegada = COALESCE(hora_llegada, now()) WHERE flete_id = $1 AND orden = $2`,
    [id, orden]
  );
  if (lat != null && lng != null) {
    await fijarParada(id, orden, lat, lng);
    await pool.query(
      `UPDATE fletes_registrados SET pos_lat = $2, pos_lng = $3, pos_en = now() WHERE id = $1`,
      [id, lat, lng]
    );
  }
  await pool.query(
    `UPDATE fletes_registrados SET parada_actual = $4
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3 AND estado_viaje = 'en_curso'`,
    [id, documento, codigoVehiculo, orden + 1]
  );
  return obtenerSeguimiento(id);
}

/**
 * Finaliza el viaje: sella la llegada al destino, la duración total, y recalcula la
 * ruta real por carretera (OSRM) con las coordenadas capturadas durante el recorrido.
 */
export async function finalizarFlete(
  id: string,
  documento: string,
  codigoVehiculo: string,
  lat?: number | null,
  lng?: number | null
): Promise<Seguimiento> {
  const pool = obtenerPool();
  const ultima = (
    await pool.query(`SELECT MAX(orden) AS m FROM flete_paradas WHERE flete_id = $1`, [id])
  ).rows[0]?.m as number | null;

  await pool.query(
    `UPDATE flete_paradas SET hora_llegada = COALESCE(hora_llegada, now()) WHERE flete_id = $1 AND orden = $2`,
    [id, ultima]
  );
  if (lat != null && lng != null && ultima != null) {
    await fijarParada(id, ultima, lat, lng);
    await pool.query(
      `UPDATE fletes_registrados SET destino_lat = $2, destino_lng = $3, pos_lat = $2, pos_lng = $3, pos_en = now() WHERE id = $1`,
      [id, lat, lng]
    );
  }
  await pool.query(
    `UPDATE fletes_registrados
        SET estado_viaje = 'finalizado', finalizado_en = now(), completado = true,
            duracion_seg = GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(iniciado_en, now())))::int)
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3`,
    [id, documento, codigoVehiculo]
  );
  await recalcularRuta(id, documento, codigoVehiculo);
  return obtenerSeguimiento(id);
}

/** Recalcula la ruta por carretera y los km por tramo con las coordenadas capturadas. */
async function recalcularRuta(fleteId: string, documento: string, codigoVehiculo: string): Promise<void> {
  const paradas = await listarParadas(fleteId);
  const conCoord = paradas.filter((p) => p.lat != null && p.lng != null);
  if (conCoord.length < 2) return;

  const ruta = await rutaOSRMMulti(conCoord.map((p) => ({ lat: p.lat as number, lng: p.lng as number })));
  const pool = obtenerPool();
  if (ruta.kmTotal != null) {
    await pool.query(`UPDATE fletes_registrados SET kilometros = $2, ruta_geometria = $3 WHERE id = $1`, [
      fleteId,
      ruta.kmTotal,
      ruta.geometria,
    ]);
    for (let i = 1; i < conCoord.length; i++) {
      await pool.query(`UPDATE flete_paradas SET km_tramo = $3 WHERE flete_id = $1 AND orden = $2`, [
        fleteId,
        conCoord[i].orden,
        ruta.tramos[i - 1] ?? null,
      ]);
    }
  }
  try {
    for (const p of conCoord) {
      await enriquecerPuntoReferencia(documento, codigoVehiculo, p.descripcion, {
        lat: p.lat as number,
        lng: p.lng as number,
        direccion: p.direccion,
        barrio: p.barrio,
        ciudad: p.ciudad,
        establecimiento: p.establecimiento,
      });
    }
  } catch (e) {
    console.error("enriquecer puntos (finalizar)", e);
  }
}
