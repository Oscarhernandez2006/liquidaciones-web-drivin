import { obtenerPool } from "@/lib/db";

export interface PuntoReferencia {
  id: string;
  descripcion: string;
  aplicaOrigen: boolean;
  aplicaDestino: boolean;
  lat: number | null;
  lng: number | null;
  direccion: string | null;
  barrio: string | null;
  ciudad: string | null;
  establecimiento: string | null;
}

/** Lista los puntos de referencia (origen/destino) configurados para un domiciliario. */
export async function listarPuntosReferencia(
  documento: string,
  codigoVehiculo: string
): Promise<PuntoReferencia[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT id, descripcion, aplica_origen, aplica_destino,
            lat, lng, direccion, barrio, ciudad, establecimiento
       FROM puntos_referencia_flete
      WHERE documento = $1 AND codigo_vehiculo = $2
      ORDER BY descripcion`,
    [documento, codigoVehiculo]
  );
  const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
  const txt = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
  return rows.map((r) => ({
    id: String(r.id),
    descripcion: r.descripcion,
    aplicaOrigen: Boolean(r.aplica_origen),
    aplicaDestino: Boolean(r.aplica_destino),
    lat: num(r.lat),
    lng: num(r.lng),
    direccion: txt(r.direccion),
    barrio: txt(r.barrio),
    ciudad: txt(r.ciudad),
    establecimiento: txt(r.establecimiento),
  }));
}

export interface GeoPunto {
  lat: number;
  lng: number;
  direccion: string | null;
  barrio: string | null;
  ciudad: string | null;
  establecimiento: string | null;
}

/**
 * Guarda la ubicación y dirección resueltas en el punto de referencia que coincide
 * por descripción; si no existe, lo crea. Best-effort: el llamador ignora errores.
 */
export async function enriquecerPuntoReferencia(
  documento: string,
  codigoVehiculo: string,
  descripcion: string,
  geo: GeoPunto
): Promise<void> {
  const desc = descripcion.trim();
  if (!desc) return;
  const pool = obtenerPool();
  const upd = await pool.query(
    `UPDATE puntos_referencia_flete
        SET lat = $4, lng = $5, direccion = $6, barrio = $7, ciudad = $8, establecimiento = $9
      WHERE documento = $1 AND codigo_vehiculo = $2 AND lower(descripcion) = lower($3)`,
    [documento, codigoVehiculo, desc, geo.lat, geo.lng, geo.direccion, geo.barrio, geo.ciudad, geo.establecimiento]
  );
  if ((upd.rowCount ?? 0) === 0) {
    await pool.query(
      `INSERT INTO puntos_referencia_flete
          (documento, codigo_vehiculo, descripcion, aplica_origen, aplica_destino,
           lat, lng, direccion, barrio, ciudad, establecimiento)
       VALUES ($1::varchar, $2::varchar, $3, true, true, $4, $5, $6, $7, $8, $9)`,
      [documento, codigoVehiculo, desc, geo.lat, geo.lng, geo.direccion, geo.barrio, geo.ciudad, geo.establecimiento]
    );
  }
}
