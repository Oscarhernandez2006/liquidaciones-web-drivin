import { NextResponse } from "next/server";
import { requireProvisioningSecret } from "@/lib/provisioningAuth";
import { setEstadoMaestroProvisioning } from "@/lib/maestro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: { params: { cedula: string } }) {
  const denied = requireProvisioningSecret(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const bloqueado = body?.bloqueadoSuite === true;
  const activo = bloqueado ? false : body?.activo === undefined ? true : Boolean(body.activo);

  const ok = await setEstadoMaestroProvisioning(context.params.cedula, activo);
  if (!ok) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
