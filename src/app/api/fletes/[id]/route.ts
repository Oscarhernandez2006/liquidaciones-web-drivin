import { NextResponse } from "next/server";
import { actualizarFlete, eliminarFlete, guardarUbicacionFlete, numOpcional } from "@/lib/fletes";
import { esDomiciliarioFlete } from "@/lib/fleteDomiciliario";
import { reverseGeocode, rutaOSRM, distanciaHaversineKm, esperar, type DireccionGeo } from "@/lib/geo";
import { enriquecerPuntoReferencia } from "@/lib/puntosReferencia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIN_DIRECCION: DireccionGeo = {
  direccion: null,
  barrio: null,
  ciudad: null,
  establecimiento: null,
};

/**
 * PUT: edita el flete o, si viene `geocodificar: true`, guarda la ubicación
 * resolviendo dirección (Nominatim) y ruta+km (OSRM) y enriquece los puntos de referencia.
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const documento = String(body.documento ?? "").trim();
    const codigoVehiculo = String(body.codigoVehiculo ?? "").trim();

    if (!esDomiciliarioFlete(documento)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const cod = codigoVehiculo.toUpperCase();
    const origenLat = numOpcional(body.origenLat);
    const origenLng = numOpcional(body.origenLng);
    const destinoLat = numOpcional(body.destinoLat);
    const destinoLng = numOpcional(body.destinoLng);
    const tieneAmbas =
      origenLat != null && origenLng != null && destinoLat != null && destinoLng != null;

    // ---- Guardado de ubicación: dirección (Nominatim) + ruta/km (OSRM) ----
    if (body.geocodificar) {
      const origenTxt = String(body.origen ?? "").trim();
      const destinoTxt = String(body.destino ?? "").trim();

      let og = SIN_DIRECCION;
      if (origenLat != null && origenLng != null) og = await reverseGeocode(origenLat, origenLng);
      let dg = SIN_DIRECCION;
      if (destinoLat != null && destinoLng != null) {
        await esperar(1100); // Nominatim: máx. 1 req/seg
        dg = await reverseGeocode(destinoLat, destinoLng);
      }

      let km = numOpcional(body.kilometros);
      let geometria: string | null = null;
      if (tieneAmbas) {
        const ruta = await rutaOSRM(origenLat!, origenLng!, destinoLat!, destinoLng!);
        geometria = ruta.geometria;
        km = ruta.km ?? distanciaHaversineKm(origenLat!, origenLng!, destinoLat!, destinoLng!);
      }

      const flete = await guardarUbicacionFlete(params.id, documento, cod, {
        origenLat,
        origenLng,
        destinoLat,
        destinoLng,
        kilometros: km,
        origenDireccion: og.direccion,
        origenBarrio: og.barrio,
        origenCiudad: og.ciudad,
        origenEstablecimiento: og.establecimiento,
        destinoDireccion: dg.direccion,
        destinoBarrio: dg.barrio,
        destinoCiudad: dg.ciudad,
        destinoEstablecimiento: dg.establecimiento,
        rutaGeometria: geometria,
        completado: Boolean(body.completado) && tieneAmbas,
      });
      if (!flete) {
        return NextResponse.json({ error: "No encontrado." }, { status: 404 });
      }

      // Guardar la ubicación resuelta también en los puntos de referencia (best-effort).
      try {
        if (origenLat != null && origenLng != null && origenTxt) {
          await enriquecerPuntoReferencia(documento, cod, origenTxt, {
            lat: origenLat,
            lng: origenLng,
            direccion: og.direccion,
            barrio: og.barrio,
            ciudad: og.ciudad,
            establecimiento: og.establecimiento,
          });
        }
        if (destinoLat != null && destinoLng != null && destinoTxt) {
          await enriquecerPuntoReferencia(documento, cod, destinoTxt, {
            lat: destinoLat,
            lng: destinoLng,
            direccion: dg.direccion,
            barrio: dg.barrio,
            ciudad: dg.ciudad,
            establecimiento: dg.establecimiento,
          });
        }
      } catch (e) {
        console.error("enriquecer puntos de referencia", e);
      }

      return NextResponse.json({ flete });
    }

    // ---- Edición normal del flete (no toca la geolocalización enriquecida) ----
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

    // Solo se puede completar si tiene las dos geoposiciones.
    const completado = Boolean(body.completado) && tieneAmbas;

    const flete = await actualizarFlete(params.id, documento, cod, {
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
  } catch (err) {
    console.error("PUT /api/fletes/[id]", err);
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
  } catch (err) {
    console.error("DELETE /api/fletes/[id]", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
