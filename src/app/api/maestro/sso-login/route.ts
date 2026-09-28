import { NextResponse } from "next/server";
import { crearTokenMaestro } from "@/lib/maestroToken";
import { obtenerMaestroPorUsuario } from "@/lib/maestro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SsoRedeemPayload = {
  cedula?: string | null;
};

function getIssuerUrl(): string {
  return String(process.env.SSO_ISSUER_URL ?? "").trim().replace(/\/+$/, "");
}

function getSharedSecret(): string {
  return String(process.env.SSO_SHARED_SECRET ?? "").trim();
}

/** POST { ticket } -> { token, nombre } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ticket = String(body.ticket ?? "").trim();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket SSO requerido." }, { status: 400 });
    }

    const issuer = getIssuerUrl();
    const secret = getSharedSecret();
    if (!issuer || !secret) {
      return NextResponse.json({ error: "SSO no está configurado." }, { status: 503 });
    }

    const controller = new AbortController();
    const timeoutMs = Number(process.env.SSO_TIMEOUT_MS ?? 7000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let redeemResponse: Response;
    try {
      redeemResponse = await fetch(`${issuer}/api/sso/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SSO-Secret": secret,
        },
        body: JSON.stringify({ ticket }),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      return NextResponse.json(
        { error: "No fue posible validar el ticket SSO." },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!redeemResponse.ok) {
      if (redeemResponse.status === 404 || redeemResponse.status === 410) {
        return NextResponse.json({ error: "Ticket SSO inválido o expirado." }, { status: 401 });
      }
      return NextResponse.json(
        { error: "No fue posible validar el ticket SSO." },
        { status: 502 }
      );
    }

    const payload = (await redeemResponse.json()) as SsoRedeemPayload;
    const usuario = String(payload.cedula ?? "").trim();
    if (!usuario) {
      return NextResponse.json(
        { error: "La identidad SSO no incluye cédula." },
        { status: 403 }
      );
    }

    const maestro = await obtenerMaestroPorUsuario(usuario);
    if (!maestro) {
      return NextResponse.json({ error: "No tienes acceso maestro." }, { status: 403 });
    }

    const token = crearTokenMaestro(maestro.usuario, maestro.nombre);
    return NextResponse.json({ token, nombre: maestro.nombre });
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
