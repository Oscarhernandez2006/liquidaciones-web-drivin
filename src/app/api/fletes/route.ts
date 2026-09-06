import { NextResponse } from "next/server";
import { crearFlete, listarFletes, numOpcional } from "@/lib/fletes";
import { crearFleteConParadas, type ParadaInput } from "@/lib/fletesRuta";
import { esDomiciliarioFlete } from "@/lib/fleteDomiciliario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?documento&codigoVehiculo -> lista de fletes del domiciliario habilitado. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const documento = (searchParams.get("documento") ?? "").trim();
    const codigoVehiculo = (searchParams.get("codigoVehiculo") ?? "").trim();

    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const fletes = await listarFletes(documento, codigoVehiculo.toUpperCase());
    return NextResponse.json({ fletes });
  } catch (err) {
    console.error("GET /api/fletes", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}

/** POST { documento, codigoVehiculo, fecha, origen, destino, descripcion, kilos } -> crea un flete. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const documento = String(body.documento ?? "").trim();
    const codigoVehiculo = String(body.codigoVehiculo ?? "").trim();

    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const cod = codigoVehiculo.toUpperCase();
    const fecha = String(body.fecha ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const kilos = Number(body.kilos);

    if (!Number.isFinite(kilos) || kilos < 0) {
      return NextResponse.json({ error: "Kilos inválidos." }, { status: 400 });
    }

    // --- Ruta con varias paradas (origen → intermedios → destino) ---
    if (Array.isArray(body.paradas)) {
      const paradas: ParadaInput[] = (body.paradas as unknown[]).map((p) => {
        const o = (p ?? {}) as Record<string, unknown>;
        return {
          descripcion: String(o.descripcion ?? "").trim(),
          lat: numOpcional(o.lat),
          lng: numOpcional(o.lng),
          direccion: o.direccion != null ? String(o.direccion) : null,
          barrio: o.barrio != null ? String(o.barrio) : null,
          ciudad: o.ciudad != null ? String(o.ciudad) : null,
          establecimiento: o.establecimiento != null ? String(o.establecimiento) : null,
        };
      });

      if (paradas.length < 2) {
        return NextResponse.json({ error: "La ruta necesita al menos origen y destino." }, { status: 400 });
      }
      if (paradas.length > 10) {
        return NextResponse.json({ error: "Máximo 10 paradas por flete." }, { status: 400 });
      }
      if (!fecha || paradas.some((p) => !p.descripcion) || !descripcion) {
        return NextResponse.json({ error: "Faltan datos del flete." }, { status: 400 });
      }

      const { flete, paradas: guardadas } = await crearFleteConParadas(
        documento,
        cod,
        { fecha, descripcion, kilos },
        paradas
      );
      return NextResponse.json({ flete, paradas: guardadas }, { status: 201 });
    }

    // --- Flete simple (origen/destino) — compatibilidad ---
    const origen = String(body.origen ?? "").trim();
    const destino = String(body.destino ?? "").trim();

    if (!fecha || !origen || !destino || !descripcion) {
      return NextResponse.json({ error: "Faltan datos del flete." }, { status: 400 });
    }

    const flete = await crearFlete(documento, cod, {
      fecha,
      origen,
      destino,
      descripcion,
      kilos,
      origenLat: numOpcional(body.origenLat),
      origenLng: numOpcional(body.origenLng),
      destinoLat: numOpcional(body.destinoLat),
      destinoLng: numOpcional(body.destinoLng),
      kilometros: numOpcional(body.kilometros),
      completado: false,
    });
    return NextResponse.json({ flete }, { status: 201 });
  } catch (err) {
    console.error("POST /api/fletes", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
