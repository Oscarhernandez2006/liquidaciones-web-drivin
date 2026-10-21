import { NextResponse } from "next/server";
import { documentoValido, ErrorSigcompro, llamarSigcompro } from "@/lib/sigcompro";
import type { PuntosAlmuerzo, SolicitudAlmuerzo } from "@/lib/almuerzos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(e: unknown) {
  if (e instanceof ErrorSigcompro) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("/api/almuerzos", e);
  return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
}

/** GET ?documento -> puntos del domiciliario y sus solicitudes recientes. */
export async function GET(req: Request) {
  const documento = documentoValido(new URL(req.url).searchParams.get("documento"));
  if (!documento) return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
  try {
    const q = `documento=${encodeURIComponent(documento)}`;
    const [puntos, solicitudes] = await Promise.all([
      llamarSigcompro<PuntosAlmuerzo>(`/externo/almuerzos/puntos?${q}`),
      llamarSigcompro<SolicitudAlmuerzo[]>(`/externo/almuerzos?${q}`),
    ]);
    return NextResponse.json({ ...puntos, solicitudes });
  } catch (e) {
    return error(e);
  }
}

/** POST { documento, puntoId, hora, nota } -> crea la solicitud. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const documento = documentoValido(body.documento);
  if (!documento) return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
  try {
    const solicitud = await llamarSigcompro<SolicitudAlmuerzo>("/externo/almuerzos", {
      method: "POST",
      body: {
        documento,
        puntoId: String(body.puntoId ?? ""),
        hora: String(body.hora ?? ""),
        nota: String(body.nota ?? "").slice(0, 300),
      },
    });
    return NextResponse.json({ solicitud }, { status: 201 });
  } catch (e) {
    return error(e);
  }
}
