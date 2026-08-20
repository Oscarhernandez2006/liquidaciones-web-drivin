import { obtenerPool } from "@/lib/db";
import type {
  ConsultaResultado,
  LiquidacionDetalle,
  LiquidacionFila,
  LiquidacionResumen,
} from "@/lib/tipos";

/**
 * Lista las liquidaciones publicadas de un domiciliario (documento + código de vehículo).
 */
export async function consultarLiquidaciones(
  documento: string,
  codigoVehiculo: string
): Promise<ConsultaResultado | null> {
  const pool = obtenerPool();

  const { rows } = await pool.query(
    `SELECT id, nombre, pdv, periodo_etiqueta, rango_fechas,
            cumple, estado_cumple, total
       FROM liquidaciones_publicadas
      WHERE documento = $1 AND codigo_vehiculo = $2
      ORDER BY fecha_desde DESC`,
    [documento, codigoVehiculo]
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
      codigoVehiculo,
      nombre: rows[0].nombre,
      pdv: rows[0].pdv ?? "",
    },
    liquidaciones,
  };
}

/**
 * Detalle de una liquidación. Exige documento + código para que un domiciliario
 * solo pueda ver la suya (evita enumerar identificadores).
 */
export async function obtenerDetalle(
  id: string,
  documento: string,
  codigoVehiculo: string
): Promise<LiquidacionDetalle | null> {
  const pool = obtenerPool();

  const { rows } = await pool.query(
    `SELECT id, nombre, pdv, periodo_etiqueta, rango_fechas,
            cumple, estado_cumple, total, detalle
       FROM liquidaciones_publicadas
      WHERE id = $1 AND documento = $2 AND codigo_vehiculo = $3
      LIMIT 1`,
    [id, documento, codigoVehiculo]
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
      codigoVehiculo,
      nombre: r.nombre,
      pdv: r.pdv ?? "",
    },
    fila,
  };
}

