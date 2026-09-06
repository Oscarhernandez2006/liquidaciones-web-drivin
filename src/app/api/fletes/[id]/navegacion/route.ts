import { NextResponse } from "next/server";
import { esDomiciliarioFlete } from "@/lib/fleteDomiciliario";
import {
  obtenerSeguimiento,
  iniciarFlete,
  guardarPosicion,
  registrarLlegada,
  finalizarFlete,
} from "@/lib/navegacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?documento -> estado de navegación + paradas del flete. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const documento = (searchParams.get("documento") ?? "").trim();
    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const seguimiento = await obtenerSeguimiento(params.id);
    return NextResponse.json(seguimiento);
  } catch (err) {
    console.error("GET /api/fletes/[id]/navegacion", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}

/** POST { documento, codigoVehiculo, accion, ... } -> iniciar | posicion | llegada | finalizar. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const documento = String(body.documento ?? "").trim();
    const cod = String(body.codigoVehiculo ?? "").trim().toUpperCase();
    const accion = String(body.accion ?? "").trim();
    const latOpc = Number.isFinite(Number(body.lat)) ? Number(body.lat) : null;
    const lngOpc = Number.isFinite(Number(body.lng)) ? Number(body.lng) : null;

    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    switch (accion) {
      case "iniciar":
        return NextResponse.json(await iniciarFlete(params.id, documento, cod, latOpc, lngOpc));

      case "posicion": {
        const lat = Number(body.lat);
        const lng = Number(body.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
        }
        await guardarPosicion(params.id, documento, cod, lat, lng);
        return NextResponse.json({ ok: true });
      }

      case "llegada": {
        const orden = Number(body.orden);
        if (!Number.isInteger(orden) || orden < 0) {
          return NextResponse.json({ error: "Parada inválida." }, { status: 400 });
        }
        return NextResponse.json(await registrarLlegada(params.id, documento, cod, orden, latOpc, lngOpc));
      }

      case "finalizar":
        return NextResponse.json(await finalizarFlete(params.id, documento, cod, latOpc, lngOpc));

      default:
        return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
    }
  } catch (err) {
    console.error("POST /api/fletes/[id]/navegacion", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
