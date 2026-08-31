import { obtenerPool } from "@/lib/db";
import type {
  ConsultaResultado,
  LiquidacionDetalle,
  LiquidacionFila,
  LiquidacionResumen,
} from "@/lib/tipos";

/**
 * Lista las liquidaciones publicadas de un domiciliario (solo documento).
 */
export async function consultarLiquidaciones(
  documento: string
): Promise<ConsultaResultado | null> {
  const pool = obtenerPool();

  const { rows } = await pool.query(
    `SELECT id, nombre, pdv, periodo_etiqueta, rango_fechas,
            cumple, estado_cumple, total, codigo_vehiculo
       FROM liquidaciones_publicadas
      WHERE documento = $1
      ORDER BY fecha_desde DESC`,
    [documento]
  );

  if (rows.length === 0) return null;

  const liquidaciones: LiquidacionResumen[] = rows.map((r) => ({
    id: String(r.id),
    periodoEtiqueta: r.periodo_etiqueta,
    rangoFechas: r.rango_fechas,
    cumple: r.cumple,
    estadoCumple: r.estado_cumple,
    total: Number(r.total),
  }));

  return {
    domiciliario: {
      documento,
      codigoVehiculo: rows[0].codigo_vehiculo ?? "",
      nombre: rows[0].nombre,
      pdv: rows[0].pdv ?? "",
    },
    liquidaciones,
  };
}

/**
 * Detalle de una liquidación. Exige solo documento para verificación de seguridad básica.
 */
export async function obtenerDetalle(
  id: string,
  documento: string
): Promise<LiquidacionDetalle | null> {
  const pool = obtenerPool();

  const { rows } = await pool.query(
    `SELECT id, nombre, pdv, periodo_etiqueta, rango_fechas,
            cumple, estado_cumple, total, detalle, codigo_vehiculo
       FROM liquidaciones_publicadas
      WHERE id = $1 AND documento = $2
      LIMIT 1`,
    [id, documento]
  );

  if (rows.length === 0) return null;

  const r = rows[0];
  const fila = r.detalle as LiquidacionFila;

  return {
    id: String(r.id),
    periodoEtiqueta: r.periodo_etiqueta,
    rangoFechas: r.rango_fechas,
    cumple: r.cumple,
    estadoCumple: r.estado_cumple,
    total: Number(r.total),
    domiciliario: {
      documento,
      codigoVehiculo: r.codigo_vehiculo ?? "",
      nombre: r.nombre,
      pdv: r.pdv ?? "",
    },
    fila,
  };
}

