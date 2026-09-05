import { obtenerPool } from "@/lib/db";

export interface PuntoReferencia {
  id: string;
  descripcion: string;
  aplicaOrigen: boolean;
  aplicaDestino: boolean;
}

/** Lista los puntos de referencia (origen/destino) configurados para un domiciliario. */
export async function listarPuntosReferencia(
  documento: string,
  codigoVehiculo: string
): Promise<PuntoReferencia[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT id, descripcion, aplica_origen, aplica_destino
       FROM puntos_referencia_flete
      WHERE documento = $1 AND codigo_vehiculo = $2
      ORDER BY descripcion`,
    [documento, codigoVehiculo]
  );
  return rows.map((r) => ({
    id: String(r.id),
    descripcion: r.descripcion,
    aplicaOrigen: Boolean(r.aplica_origen),
    aplicaDestino: Boolean(r.aplica_destino),
  }));
}
