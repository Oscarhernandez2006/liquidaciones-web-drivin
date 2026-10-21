import { NextResponse } from "next/server";
import { documentoValido, ErrorSigcompro, llamarSigcompro } from "@/lib/sigcompro";
import type { SolicitudAlmuerzo } from "@/lib/almuerzos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH { documento } -> cancela una solicitud pendiente propia. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const documento = documentoValido(body.documento);
  if (!documento || !/^\d+$/.test(params.id)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  try {
    const solicitud = await llamarSigcompro<SolicitudAlmuerzo>(
      `/externo/almuerzos/${params.id}/cancelar`,
      { method: "PATCH", body: { documento } },
    );
    return NextResponse.json({ solicitud });
  } catch (e) {
    if (e instanceof ErrorSigcompro) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("PATCH /api/almuerzos/[id]/cancelar", e);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
