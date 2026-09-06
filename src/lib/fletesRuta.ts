import { crearFlete, guardarUbicacionFlete, actualizarMetaFlete } from "@/lib/fletes";
import { guardarParadas, listarParadas, type Parada, type ParadaEntrada } from "@/lib/paradas";
import { reverseGeocode, rutaOSRMMulti, esperar, type DireccionGeo } from "@/lib/geo";
import { enriquecerPuntoReferencia } from "@/lib/puntosReferencia";
import type { Flete } from "@/lib/tipos";

/** Una parada tal como llega del cliente al construir la ruta. */
export interface ParadaInput {
  descripcion: string;
  lat: number | null;
  lng: number | null;
  // Si la parada viene del catálogo, puede traer ya la dirección resuelta.
  direccion?: string | null;
  barrio?: string | null;
  ciudad?: string | null;
  establecimiento?: string | null;
  // Carga entregada en esta parada (el origen es recogida).
  cargaDescripcion?: string | null;
  cargaKilos?: number | null;
}

/**
 * Crea un flete con su ruta de varias paradas: geocodifica las que no traen
 * dirección (Nominatim), calcula la ruta por carretera (OSRM) con km por tramo
 * y total, guarda las paradas y enriquece los puntos de referencia.
 */
export async function crearFleteConParadas(
  documento: string,
  codigoVehiculo: string,
  base: { fecha: string; descripcion: string; kilos: number },
  paradasInput: ParadaInput[]
): Promise<{ flete: Flete; paradas: Parada[] }> {
  const origen = paradasInput[0]?.descripcion ?? "";
  const destino = paradasInput[paradasInput.length - 1]?.descripcion ?? "";
  const primera = paradasInput[0];
  const ultima = paradasInput[paradasInput.length - 1];

  // 1) Flete base (origen/destino texto + coords de extremos para compatibilidad).
  const fleteBase = await crearFlete(documento, codigoVehiculo, {
    fecha: base.fecha,
    origen,
    destino,
    descripcion: base.descripcion,
    kilos: base.kilos,
    origenLat: primera?.lat ?? null,
    origenLng: primera?.lng ?? null,
    destinoLat: ultima?.lat ?? null,
    destinoLng: ultima?.lng ?? null,
    kilometros: null,
    completado: false,
  });

  // 2) Resolver dirección de cada parada (reutiliza la del catálogo si viene).
  const resueltas: (ParadaInput & DireccionGeo)[] = [];
  let yaLlamoNominatim = false;
  for (const p of paradasInput) {
    let geo: DireccionGeo = {
      direccion: p.direccion ?? null,
      barrio: p.barrio ?? null,
      ciudad: p.ciudad ?? null,
      establecimiento: p.establecimiento ?? null,
    };
    if (p.lat != null && p.lng != null && !p.direccion) {
      if (yaLlamoNominatim) await esperar(1100); // Nominatim: máx. 1 req/seg
      geo = await reverseGeocode(p.lat, p.lng);
      yaLlamoNominatim = true;
    }
    resueltas.push({ ...p, ...geo });
  }

  // 3) Ruta por carretera pasando por todas las paradas con coordenadas.
  const coords = resueltas
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({ lat: p.lat as number, lng: p.lng as number }));
  const ruta = coords.length >= 2 ? await rutaOSRMMulti(coords) : { kmTotal: null, geometria: null, tramos: [] };

  // 4) Guardar las paradas con el km del tramo previo.
  const paradasEntrada: ParadaEntrada[] = resueltas.map((p, i) => ({
    descripcion: p.descripcion,
    lat: p.lat,
    lng: p.lng,
    direccion: p.direccion,
    barrio: p.barrio,
    ciudad: p.ciudad,
    establecimiento: p.establecimiento,
    kmTramo: i === 0 ? null : ruta.tramos[i - 1] ?? null,
    cargaDescripcion: p.cargaDescripcion ?? null,
    cargaKilos: p.cargaKilos ?? null,
  }));
  const paradas = await guardarParadas(fleteBase.id, paradasEntrada);

  // 5) Actualizar el flete con km total, geometría y geo de los extremos.
  const o = resueltas[0];
  const d = resueltas[resueltas.length - 1];
  const flete =
    (await guardarUbicacionFlete(fleteBase.id, documento, codigoVehiculo, {
      origenLat: o?.lat ?? null,
      origenLng: o?.lng ?? null,
      destinoLat: d?.lat ?? null,
      destinoLng: d?.lng ?? null,
      kilometros: ruta.kmTotal,
      origenDireccion: o?.direccion ?? null,
      origenBarrio: o?.barrio ?? null,
      origenCiudad: o?.ciudad ?? null,
      origenEstablecimiento: o?.establecimiento ?? null,
      destinoDireccion: d?.direccion ?? null,
      destinoBarrio: d?.barrio ?? null,
      destinoCiudad: d?.ciudad ?? null,
      destinoEstablecimiento: d?.establecimiento ?? null,
      rutaGeometria: ruta.geometria,
      completado: false,
    })) ?? fleteBase;
  await actualizarMetaFlete(fleteBase.id, paradas.length);
  // El flete se devolvió antes de guardar el conteo: lo reflejamos en la respuesta.
  flete.paradasCount = paradas.length;

  // 6) Enriquecer el catálogo de puntos de referencia (best-effort).
  try {
    for (const p of resueltas) {
      if (p.lat != null && p.lng != null && p.descripcion.trim()) {
        await enriquecerPuntoReferencia(documento, codigoVehiculo, p.descripcion, {
          lat: p.lat,
          lng: p.lng,
          direccion: p.direccion,
          barrio: p.barrio,
          ciudad: p.ciudad,
          establecimiento: p.establecimiento,
        });
      }
    }
  } catch (e) {
    console.error("enriquecer puntos (ruta)", e);
  }

  return { flete, paradas };
}

/** Lista las paradas de un flete (para el mapa/detalle). */
export { listarParadas };
