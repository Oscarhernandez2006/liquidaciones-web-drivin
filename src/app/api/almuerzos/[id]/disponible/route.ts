import { NextResponse } from "next/server";
import { documentoValido, ErrorSigcompro, llamarSigcompro } from "@/lib/sigcompro";
import type { SolicitudAlmuerzo } from "@/lib/almuerzos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const documento = documentoValido(body.documento);
  if (!documento || !/^\d+$/.test(params.id)) return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  try {
    const solicitud = await llamarSigcompro<SolicitudAlmuerzo>(`/externo/almuerzos/${params.id}/disponible`, { method: "PATCH", body: { documento } });
    return NextResponse.json({ solicitud });
  } catch (error) {
    if (error instanceof ErrorSigcompro) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudo confirmar la disponibilidad." }, { status: 500 });
  }
}