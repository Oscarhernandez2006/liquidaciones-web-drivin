import { NextResponse } from "next/server";
import { documentoValido, ErrorSigcompro, llamarSigcompro } from "@/lib/sigcompro";
import type { SolicitudExtension } from "@/lib/extensiones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?documento -> extensiones recientes del domiciliario en todos sus estados. */
export async function GET(req: Request) {
  const documento = documentoValido(new URL(req.url).searchParams.get("documento"));
  if (!documento) return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
  try {
    const extensiones = await llamarSigcompro<SolicitudExtension[]>(
      `/externo/extensiones/domiciliario?documento=${encodeURIComponent(documento)}`,
    );
    return NextResponse.json({ extensiones });
  } catch (e) {
    if (e instanceof ErrorSigcompro) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("/api/extensiones", e);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
