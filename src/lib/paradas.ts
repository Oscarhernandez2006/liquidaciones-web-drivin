import { obtenerPool } from "@/lib/db";

export type TipoParada = "origen" | "intermedio" | "destino";

/** Una parada de la ruta de un flete (origen, intermedia o destino). */
export interface Parada {
  id: string;
  orden: number;
  tipo: TipoParada;
  descripcion: string;
  lat: number | null;
  lng: number | null;
  direccion: string | null;
  barrio: string | null;
  ciudad: string | null;
  establecimiento: string | null;
  kmTramo: number | null;
  cargaDescripcion: string | null;
  cargaKilos: number | null;
  horaLlegada: string | null;
  horaSalida: string | null;
}

/** Datos para guardar una parada (la dirección/km ya vienen resueltos). */
export interface ParadaEntrada {
  descripcion: string;
  lat: number | null;
  lng: number | null;
  direccion?: string | null;
  barrio?: string | null;
  ciudad?: string | null;
  establecimiento?: string | null;
  kmTramo?: number | null;
  cargaDescripcion?: string | null;
  cargaKilos?: number | null;
}

function tipoPorPosicion(indice: number, total: number): TipoParada {
  if (indice === 0) return "origen";
  if (indice === total - 1) return "destino";
  return "intermedio";
}

function mapear(r: Record<string, unknown>): Parada {
  const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
  const txt = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
  return {
    id: String(r.id),
    orden: Number(r.orden),
    tipo: String(r.tipo) as TipoParada,
    descripcion: String(r.descripcion),
    lat: num(r.lat),
    lng: num(r.lng),
    direccion: txt(r.direccion),
    barrio: txt(r.barrio),
    ciudad: txt(r.ciudad),
    establecimiento: txt(r.establecimiento),
    kmTramo: num(r.km_tramo),
    cargaDescripcion: txt(r.carga_descripcion),
    cargaKilos: num(r.carga_kilos),
    horaLlegada: r.hora_llegada instanceof Date ? r.hora_llegada.toISOString() : txt(r.hora_llegada),
    horaSalida: r.hora_salida instanceof Date ? r.hora_salida.toISOString() : txt(r.hora_salida),
  };
}

/** Lista las paradas de un flete en orden (origen → intermedios → destino). */
export async function listarParadas(fleteId: string): Promise<Parada[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT id, orden, tipo, descripcion, lat, lng, direccion, barrio, ciudad,
            establecimiento, km_tramo, carga_descripcion, carga_kilos, hora_llegada, hora_salida
       FROM flete_paradas
      WHERE flete_id = $1
      ORDER BY orden`,
    [fleteId]
  );
  return rows.map(mapear);
}

/**
 * Reemplaza todas las paradas de un flete por la lista dada (en una transacción).
 * El tipo (origen/intermedio/destino) se asigna según la posición.
 */
export async function guardarParadas(fleteId: string, paradas: ParadaEntrada[]): Promise<Parada[]> {
  const pool = obtenerPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM flete_paradas WHERE flete_id = $1`, [fleteId]);

    for (let i = 0; i < paradas.length; i++) {
      const p = paradas[i];
      await client.query(
        `INSERT INTO flete_paradas
            (flete_id, orden, tipo, descripcion, lat, lng, direccion, barrio, ciudad, establecimiento, km_tramo, carga_descripcion, carga_kilos)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          fleteId,
          i,
          tipoPorPosicion(i, paradas.length),
          p.descripcion,
          p.lat,
          p.lng,
          p.direccion ?? null,
          p.barrio ?? null,
          p.ciudad ?? null,
          p.establecimiento ?? null,
          p.kmTramo ?? null,
          p.cargaDescripcion ?? null,
          p.cargaKilos ?? null,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return listarParadas(fleteId);
}
