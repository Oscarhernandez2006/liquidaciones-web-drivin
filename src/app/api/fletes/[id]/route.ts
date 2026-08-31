import { NextResponse } from "next/server";
import { actualizarFlete, eliminarFlete, numOpcional } from "@/lib/fletes";
import { esDomiciliarioFlete } from "@/lib/fleteDomiciliario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT { documento, codigoVehiculo, fecha, origen, destino, descripcion, kilos } -> edita el flete. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const documento = String(body.documento ?? "").trim();
    const codigoVehiculo = String(body.codigoVehiculo ?? "").trim();

    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const fecha = String(body.fecha ?? "").trim();
    const origen = String(body.origen ?? "").trim();
    const destino = String(body.destino ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const kilos = Number(body.kilos);

    if (!fecha || !origen || !destino || !descripcion) {
      return NextResponse.json({ error: "Faltan datos del flete." }, { status: 400 });
    }
    if (!Number.isFinite(kilos) || kilos < 0) {
      return NextResponse.json({ error: "Kilos inválidos." }, { status: 400 });
    }

    const origenLat = numOpcional(body.origenLat);
    const origenLng = numOpcional(body.origenLng);
    const destinoLat = numOpcional(body.destinoLat);
    const destinoLng = numOpcional(body.destinoLng);
    const tieneAmbas =
      origenLat != null && origenLng != null && destinoLat != null && destinoLng != null;
    // Solo se puede completar si tiene las dos geoposiciones.
    const completado = Boolean(body.completado) && tieneAmbas;

    const flete = await actualizarFlete(params.id, documento, codigoVehiculo.toUpperCase(), {
      fecha,
      origen,
      destino,
      descripcion,
      kilos,
      origenLat,
      origenLng,
      destinoLat,
      destinoLng,
      kilometros: numOpcional(body.kilometros),
      completado,
    });
    if (!flete) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }
    return NextResponse.json({ flete });
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}

/** DELETE ?documento&codigoVehiculo -> elimina el flete. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const documento = (searchParams.get("documento") ?? "").trim();
    const codigoVehiculo = (searchParams.get("codigoVehiculo") ?? "").trim();

    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const ok = await eliminarFlete(params.id, documento, codigoVehiculo.toUpperCase());
    if (!ok) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
