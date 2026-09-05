import { NextResponse } from "next/server";
import { listarPuntosReferencia } from "@/lib/puntosReferencia";
import { esDomiciliarioFlete } from "@/lib/fleteDomiciliario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?documento&codigoVehiculo -> puntos de referencia (origen/destino) disponibles. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const documento = (searchParams.get("documento") ?? "").trim();
    const codigoVehiculo = (searchParams.get("codigoVehiculo") ?? "").trim();

    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const puntos = await listarPuntosReferencia(documento, codigoVehiculo.toUpperCase());
    return NextResponse.json({ puntos });
  } catch (err) {
    console.error("GET /api/puntos-referencia", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
