import { NextResponse } from "next/server";
import { requireProvisioningSecret } from "@/lib/provisioningAuth";
import { listarRolesMaestro } from "@/lib/maestro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireProvisioningSecret(req);
  if (denied) return denied;

  const roles = await listarRolesMaestro();
  return NextResponse.json({
    roles,
    grupos: [
      {
        label: "Acceso maestro",
        modules: [
          { key: "maestro.portal", label: "Portal maestro" },
          { key: "maestro.consultar", label: "Consultar liquidaciones" },
          { key: "maestro.fletes", label: "Registrar fletes" },
        ],
      },
    ],
    companies: [],
  });
}
