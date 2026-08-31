import { NextResponse } from "next/server";
import { consultarFueraRango } from "@/lib/fueraRango";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { documento } -> períodos con pedidos fuera de rango del domiciliario. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const documento = String(body.documento ?? "").trim();

    if (!documento) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }

    const resultado = await consultarFueraRango(documento);
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
