import { NextResponse } from "next/server";
import { consultarLiquidaciones } from "@/lib/consultas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { documento, codigoVehiculo } -> liquidaciones del domiciliario. */
export async function POST(req: Request) {
  try {
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
