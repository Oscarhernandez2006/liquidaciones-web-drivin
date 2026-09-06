import { NextResponse } from "next/server";
import { listarParadas } from "@/lib/paradas";
import { esDomiciliarioFlete } from "@/lib/fleteDomiciliario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?documento -> paradas (origen → intermedios → destino) de un flete. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const documento = (searchParams.get("documento") ?? "").trim();

    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const paradas = await listarParadas(params.id);
    return NextResponse.json({ paradas });
  } catch (err) {
    console.error("GET /api/fletes/[id]/paradas", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
