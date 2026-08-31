import { obtenerPool } from "@/lib/db";
import type { FueraRangoFila, FueraRangoPeriodo, FueraRangoResultado } from "@/lib/tipos";

/**
 * Lista los períodos con pedidos fuera de rango publicados de un domiciliario.
 * Devuelve periodos vacío si aún no se ha publicado nada (o la tabla no existe).
 */
export async function consultarFueraRango(documento: string): Promise<FueraRangoResultado> {
  const pool = obtenerPool();

  try {
    const { rows } = await pool.query(
      `SELECT id, periodo_etiqueta, rango_fechas, total, detalle
         FROM fuera_rango_publicados
        WHERE documento = $1
        ORDER BY fecha_desde DESC`,
      [documento]
    );

    const periodos: FueraRangoPeriodo[] = rows.map((r) => ({
      id: String(r.id),
      periodoEtiqueta: r.periodo_etiqueta,
      rangoFechas: r.rango_fechas,
      total: Number(r.total),
      filas: (r.detalle as FueraRangoFila[]) ?? [],
    }));

    return { periodos };
  } catch (err) {
    // 42P01 = la tabla aún no existe (no se ha publicado nada desde la app).
    if (err && typeof err === "object" && "code" in err && err.code === "42P01") {
      return { periodos: [] };
    }
    throw err;
  }
}
