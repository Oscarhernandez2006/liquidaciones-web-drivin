import { NextResponse } from "next/server";
import { listarDomiciliariosPublicados } from "@/lib/maestro";
import { verificarTokenMaestro } from "@/lib/maestroToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET (header x-maestro-token) -> lista de domiciliarios con liquidaciones publicadas. */
export async function GET(req: Request) {
  try {
    const token = req.headers.get("x-maestro-token");
    if (!verificarTokenMaestro(token)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const domiciliarios = await listarDomiciliariosPublicados();
    return NextResponse.json({ domiciliarios });
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
