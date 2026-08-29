import { NextResponse } from "next/server";
import { consultarLiquidaciones } from "@/lib/consultas";
import { verificarTokenMaestro } from "@/lib/maestroToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { documento, codigoVehiculo } (header x-maestro-token) -> liquidaciones del domiciliario elegido. */
export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-maestro-token");
    if (!verificarTokenMaestro(token)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const documento = String(body.documento ?? "").trim();
    const codigoVehiculo = String(body.codigoVehiculo ?? "").trim();

    if (!documento || !codigoVehiculo) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }

    const resultado = await consultarLiquidaciones(documento, codigoVehiculo);
    if (!resultado) {
      return NextResponse.json({ error: "Sin resultados." }, { status: 404 });
    }
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
