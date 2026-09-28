import { NextResponse } from "next/server";

export function requireProvisioningSecret(req: Request): NextResponse | null {
  const secret = String(process.env.SSO_SHARED_SECRET ?? "").trim();
  const provided = String(req.headers.get("x-sso-secret") ?? "").trim();
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}
