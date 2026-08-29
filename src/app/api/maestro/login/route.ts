import { NextResponse } from "next/server";
import { autenticarMaestro } from "@/lib/maestro";
import { crearTokenMaestro } from "@/lib/maestroToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { usuario, contrasena } -> { token, nombre } para un usuario maestro. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const usuario = String(body.usuario ?? "").trim();
    const contrasena = String(body.contrasena ?? "");

    if (!usuario || !contrasena) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }

    const maestro = await autenticarMaestro(usuario, contrasena);
    if (!maestro) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    const token = crearTokenMaestro(maestro.usuario, maestro.nombre);
    return NextResponse.json({ token, nombre: maestro.nombre });
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
