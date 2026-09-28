import { NextResponse } from "next/server";
import { requireProvisioningSecret } from "@/lib/provisioningAuth";
import { listarMaestrosProvisioning, upsertMaestroProvisioning } from "@/lib/maestro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireProvisioningSecret(req);
  if (denied) return denied;

  const rows = await listarMaestrosProvisioning();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const denied = requireProvisioningSecret(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  try {
    const result = await upsertMaestroProvisioning({
      cedula: body.cedula,
      email: body.email,
      nombre: body.nombre,
      rol: body.rol,
      activo: body.activo,
      password: body.password,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
