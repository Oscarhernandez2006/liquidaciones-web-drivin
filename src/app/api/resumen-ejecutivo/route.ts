import { NextResponse } from "next/server";
import { requireProvisioningSecret } from "@/lib/provisioningAuth";
import { obtenerPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resumen ejecutivo para "Estadísticas generales" de la Suite.
export async function GET(req: Request) {
  const denied = requireProvisioningSecret(req);
  if (denied) return denied;

  const { rows } = await obtenerPool().query(`
    WITH d AS (SELECT (now() AT TIME ZONE 'America/Bogota')::date AS hoy)
    SELECT
      COUNT(f.id) FILTER (WHERE f.fecha = d.hoy) AS fletes_hoy,
      COALESCE(SUM(f.kilos) FILTER (WHERE f.fecha = d.hoy), 0) AS kilos_hoy,
      COUNT(f.id) FILTER (WHERE f.completado AND NOT f.enviado) AS por_enviar,
      COUNT(f.id) FILTER (WHERE f.enviado AND NOT f.liquidado) AS por_liquidar
    FROM d LEFT JOIN fletes_registrados f ON true
    GROUP BY d.hoy
  `);
  const r = rows[0] ?? {};
  const n = (k: string) => Number(r[k]) || 0;

  return NextResponse.json({
    metrics: [
      { key: "fletes_hoy", label: "Fletes hoy", value: n("fletes_hoy") },
      { key: "kilos_hoy", label: "Kg enviados hoy", value: Math.round(n("kilos_hoy")), format: "kg" },
      { key: "por_enviar", label: "Por enviar", value: n("por_enviar"), tone: n("por_enviar") > 0 ? "warn" : "default" },
      { key: "por_liquidar", label: "Por liquidar", value: n("por_liquidar") },
    ],
  });
}
