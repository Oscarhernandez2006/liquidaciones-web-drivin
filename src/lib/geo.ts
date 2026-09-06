// Reverse geocoding (Nominatim/OpenStreetMap) y ruteo (OSRM). Servicios libres,
// sin API key. Todas las llamadas se hacen desde el servidor (API routes).

/** Dirección resuelta a partir de una coordenada. */
export interface DireccionGeo {
  direccion: string | null;      // dirección legible (display_name)
  barrio: string | null;         // barrio/sector
  ciudad: string | null;         // ciudad/municipio
  establecimiento: string | null; // nombre del POI si la coordenada cae sobre uno
}

/** Ruta por carretera entre dos puntos. */
export interface RutaGeo {
  km: number | null;           // distancia por carretera en kilómetros
  geometria: string | null;    // polyline codificada (para dibujar en el mapa)
}

const UA = "LiquidacionesDrivin/1.0 (fletes; contacto: carnessantacruz)";

/** Nominatim exige máximo 1 req/seg; usamos este helper para espaciar llamadas. */
export function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Reverse geocoding con Nominatim. Devuelve dirección, barrio, ciudad y, si la
 * coordenada cae sobre un POI, el nombre del establecimiento. Nunca lanza: ante
 * un fallo devuelve todo en null para no bloquear el guardado del flete.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<DireccionGeo> {
  const vacio: DireccionGeo = { direccion: null, barrio: null, ciudad: null, establecimiento: null };
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}` +
      `&format=jsonv2&addressdetails=1&namedetails=1&zoom=18&accept-language=es`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "es" },
      cache: "no-store",
    });
    if (!res.ok) return vacio;

    const data = (await res.json()) as {
      display_name?: string;
      name?: string;
      type?: string;
      addresstype?: string;
      address?: Record<string, string>;
      namedetails?: Record<string, string>;
    };
    const a = data.address ?? {};

    const barrio =
      a.neighbourhood ?? a.suburb ?? a.quarter ?? a.residential ?? a.city_district ?? null;
    const ciudad = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null;

    // El establecimiento es el nombre del POI cuando la coordenada cae sobre uno
    // (tienda, centro comercial, restaurante, etc.), no una simple vía o casa.
    const tiposVia = new Set(["road", "residential", "house", "yes", "administrative"]);
    const nombrePoi = data.name || data.namedetails?.name || null;
    const esPoi = nombrePoi && !tiposVia.has(data.addresstype ?? data.type ?? "");
    const establecimiento = esPoi ? nombrePoi : null;

    return {
      direccion: data.display_name ?? null,
      barrio,
      ciudad,
      establecimiento,
    };
  } catch {
    return vacio;
  }
}

/**
 * Ruta por carretera (OSRM demo público). Devuelve los km reales y la geometría
 * (polyline) para dibujar la ruta en el mapa. Nunca lanza: ante un fallo devuelve
 * km/geometría en null y el llamador puede usar la distancia en línea recta.
 */
export async function rutaOSRM(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number
): Promise<RutaGeo> {
  const vacio: RutaGeo = { km: null, geometria: null };
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${oLng},${oLat};${dLng},${dLat}` +
      `?overview=full&geometries=polyline`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return vacio;

    const data = (await res.json()) as {
      code?: string;
      routes?: { distance?: number; geometry?: string }[];
    };
    const ruta = data.code === "Ok" ? data.routes?.[0] : undefined;
    if (!ruta || ruta.distance == null) return vacio;

    return {
      km: Math.round((ruta.distance / 1000) * 100) / 100,
      geometria: ruta.geometry ?? null,
    };
  } catch {
    return vacio;
  }
}

/** Distancia en kilómetros en línea recta (Haversine). Respaldo si OSRM falla. */
export function distanciaHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

export interface PuntoCoord {
  lat: number;
  lng: number;
}

export interface RutaMulti {
  kmTotal: number | null;   // distancia total por carretera
  geometria: string | null; // polyline de toda la ruta
  tramos: number[];         // km de cada tramo (entre paradas consecutivas)
}

/**
 * Ruta por carretera que pasa por varias paradas en orden (OSRM). Devuelve el
 * total, la geometría completa y los km de cada tramo (legs). Nunca lanza:
 * ante un fallo devuelve todo vacío y el llamador usa Haversine por tramo.
 */
export async function rutaOSRMMulti(coords: PuntoCoord[]): Promise<RutaMulti> {
  const vacio: RutaMulti = { kmTotal: null, geometria: null, tramos: [] };
  if (coords.length < 2) return vacio;
  try {
    const puntos = coords.map((c) => `${c.lng},${c.lat}`).join(";");
    const url =
      `https://router.project-osrm.org/route/v1/driving/${puntos}` +
      `?overview=full&geometries=polyline`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return vacio;

    const data = (await res.json()) as {
      code?: string;
      routes?: { distance?: number; geometry?: string; legs?: { distance?: number }[] }[];
    };
    const ruta = data.code === "Ok" ? data.routes?.[0] : undefined;
    if (!ruta || ruta.distance == null) return vacio;

    const km = (m?: number) => (m == null ? 0 : Math.round((m / 1000) * 100) / 100);
    return {
      kmTotal: km(ruta.distance),
      geometria: ruta.geometry ?? null,
      tramos: (ruta.legs ?? []).map((l) => km(l.distance)),
    };
  } catch {
    return vacio;
  }
}

