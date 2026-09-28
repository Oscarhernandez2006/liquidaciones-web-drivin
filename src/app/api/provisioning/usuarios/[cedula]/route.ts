import { NextResponse } from "next/server";
import { requireProvisioningSecret } from "@/lib/provisioningAuth";
import { obtenerMaestroProvisioning } from "@/lib/maestro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: { cedula: string } }) {
  const denied = requireProvisioningSecret(req);
  if (denied) return denied;

  const row = await obtenerMaestroProvisioning(context.params.cedula);
  if (!row) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  return NextResponse.json(row);
}
