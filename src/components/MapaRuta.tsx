"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef } from "react";
import { colorParada } from "@/lib/colores";

interface PuntoMapa {
  lat: number | null;
  lng: number | null;
  descripcion: string;
}

interface Props {
  paradas: PuntoMapa[];
  /** Polyline codificada (OSRM) para dibujar la ruta real; si falta, une con líneas rectas. */
  geometria?: string | null;
  /** Posición actual del conductor (navegación en vivo). */
  posicion?: { lat: number; lng: number } | null;
  /** Clase de altura del contenedor (por defecto h-56). */
  alto?: string;
}

let leafletPromise: Promise<any> | null = null;

/** Carga Leaflet (CSS + JS) desde CDN una sola vez. */
function cargarLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error("No se pudo cargar el mapa."));
    document.body.appendChild(script);
  });
  return leafletPromise;
}

function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0, lat = 0, lng = 0, shift, result, byte;
  const coords: [number, number][] = [];
  const factor = Math.pow(10, precision);
  while (index < str.length) {
    shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / factor, lng / factor]);
  }
  return coords;
}

export default function MapaRuta({ paradas, geometria, posicion, alto = "h-56" }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<any>(null);
  const capa = useRef<any>(null);

  useEffect(() => {
    let cancelado = false;
    cargarLeaflet()
      .then((L) => {
        if (cancelado || !contenedor.current) return;
        if (!mapa.current) {
          mapa.current = L.map(contenedor.current, { attributionControl: false }).setView([4.65, -74.1], 5);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapa.current);
        }
        const map = mapa.current;
        if (capa.current) map.removeLayer(capa.current);
        const grupo = L.layerGroup().addTo(map);
        capa.current = grupo;

        const total = paradas.length;
        paradas.forEach((p, i) => {
          if (p.lat == null || p.lng == null) return;
          const color = colorParada(i, total);
          L.circleMarker([p.lat, p.lng], { radius: 8, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 })
            .addTo(grupo)
            .bindPopup(p.descripcion);
        });

        const puntos = paradas.filter((p) => p.lat != null && p.lng != null).map((p) => [p.lat, p.lng]) as [number, number][];
        if (geometria) {
          const ruta = decodePolyline(geometria);
          L.polyline(ruta, { color: "#2563EB", weight: 4, opacity: 0.85 }).addTo(grupo);
          if (ruta.length) map.fitBounds(ruta, { padding: [30, 30] });
        } else if (puntos.length > 1) {
          L.polyline(puntos, { color: "#2563EB", weight: 3, opacity: 0.6, dashArray: "6 6" }).addTo(grupo);
          map.fitBounds(puntos, { padding: [30, 30] });
        } else if (puntos.length === 1) {
          map.setView(puntos[0], 15);
        }

        // Posición en vivo del conductor.
        if (posicion) {
          L.circleMarker([posicion.lat, posicion.lng], {
            radius: 10,
            color: "#1D4ED8",
            weight: 3,
            fillColor: "#3B82F6",
            fillOpacity: 1,
          })
            .addTo(grupo)
            .bindPopup("Tú (posición actual)");
        }

        setTimeout(() => map.invalidateSize(), 60);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [paradas, geometria, posicion]);

  return <div ref={contenedor} className={`${alto} w-full rounded-lg bg-drivin-bg`} />;
}
