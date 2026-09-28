import { NextResponse } from "next/server";
import { requireProvisioningSecret } from "@/lib/provisioningAuth";
import { setPasswordMaestroProvisioning } from "@/lib/maestro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: { params: { cedula: string } }) {
  const denied = requireProvisioningSecret(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? "");
  if (!password) {
    return NextResponse.json({ error: "La contraseña es obligatoria" }, { status: 400 });
  }

  const ok = await setPasswordMaestroProvisioning(context.params.cedula, password);
  if (!ok) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
