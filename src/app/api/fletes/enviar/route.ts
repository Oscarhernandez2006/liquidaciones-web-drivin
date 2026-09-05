import { NextResponse } from "next/server";
import { enviarFletes } from "@/lib/fletes";
import { esDomiciliarioFlete } from "@/lib/fleteDomiciliario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { documento, codigoVehiculo } -> marca como enviados los fletes completados. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const documento = String(body.documento ?? "").trim();
    const codigoVehiculo = String(body.codigoVehiculo ?? "").trim();

    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const fletes = await enviarFletes(documento, codigoVehiculo.toUpperCase());
    return NextResponse.json({ fletes });
  } catch (err) {
    console.error("POST /api/fletes/enviar", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
