import { NextResponse } from "next/server";
import { obtenerDetalle } from "@/lib/consultas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/liquidacion/[id]?documento=&codigo= -> detalle (solo si coinciden las credenciales). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const documento = (searchParams.get("documento") ?? "").trim();
    const codigo = (searchParams.get("codigo") ?? "").trim();

    if (!documento || !codigo) {
      return NextResponse.json({ error: "Faltan credenciales." }, { status: 400 });
    }

    const detalle = await obtenerDetalle(params.id, documento, codigo);
    if (!detalle) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }
    return NextResponse.json(detalle);
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
