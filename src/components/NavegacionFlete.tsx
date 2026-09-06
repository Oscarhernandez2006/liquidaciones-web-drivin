"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MapaRuta from "./MapaRuta";
import { IconoPlay, IconoMeta, IconoCheck } from "./Iconos";
import { colorParada } from "@/lib/colores";
import type { Flete } from "@/lib/tipos";

interface Parada {
  id: string;
  orden: number;
  tipo: "origen" | "intermedio" | "destino";
  descripcion: string;
  lat: number | null;
  lng: number | null;
  direccion: string | null;
  horaLlegada: string | null;
  horaSalida: string | null;
}

interface EstadoSeguimiento {
  id: string;
  estadoViaje: "planeado" | "en_curso" | "finalizado";
  paradaActual: number | null;
  posLat: number | null;
  posLng: number | null;
  iniciadoEn: string | null;
  finalizadoEn: string | null;
  duracionSeg: number | null;
  kilometros: number | null;
  rutaGeometria: string | null;
}

interface Props {
  documento: string;
  codigoVehiculo: string;
  flete: Flete;
  onSalir: (fleteActualizado?: Flete) => void;
}

function fmtHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
function fmtDuracion(seg: number | null): string {
  if (seg == null) return "—";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export default function NavegacionFlete({ documento, codigoVehiculo, flete, onSalir }: Props) {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [estado, setEstado] = useState<EstadoSeguimiento | null>(null);
  const [posicion, setPosicion] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const watchId = useRef<number | null>(null);
  const ultimoEnvio = useRef(0);

  const base = { documento, codigoVehiculo };

  const cargar = useCallback(async () => {
    try {
      const params = new URLSearchParams({ documento });
      const res = await fetch(`/api/fletes/${flete.id}/navegacion?${params.toString()}`);
      if (!res.ok) throw new Error("No se pudo cargar la navegación.");
      const data: { estado: EstadoSeguimiento | null; paradas: Parada[] } = await res.json();
      setParadas(data.paradas);
      setEstado(data.estado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setCargando(false);
    }
  }, [documento, flete.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const enviarPosicion = useCallback(
    (lat: number, lng: number) => {
      void fetch(`/api/fletes/${flete.id}/navegacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, accion: "posicion", lat, lng }),
      }).catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flete.id, documento, codigoVehiculo]
  );

  const iniciarWatch = useCallback(() => {
    if (watchId.current != null || typeof navigator === "undefined" || !navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosicion({ lat, lng });
        const ahora = Date.now();
        if (ahora - ultimoEnvio.current > 8000) {
          ultimoEnvio.current = ahora;
          enviarPosicion(lat, lng);
        }
      },
      () => setError("Activa el permiso de ubicación para seguir la ruta."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [enviarPosicion]);

  // Arranca el seguimiento GPS cuando el viaje está en curso.
  useEffect(() => {
    if (estado?.estadoViaje === "en_curso") iniciarWatch();
    return () => {
      if (watchId.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [estado?.estadoViaje, iniciarWatch]);

  async function accion(payload: Record<string, unknown>) {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch(`/api/fletes/${flete.id}/navegacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, ...payload }),
      });
      if (!res.ok) throw new Error("No se pudo completar la acción.");
      const data: { estado: EstadoSeguimiento | null; paradas: Parada[] } = await res.json();
      if (data.paradas) setParadas(data.paradas);
      if (data.estado) setEstado(data.estado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setOcupado(false);
    }
  }

  const enCurso = estado?.estadoViaje === "en_curso";

  // Obtiene una lectura fresca del GPS (para fijar la ubicación de origen/parada/destino).
  function posicionActual(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(posicion);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(posicion),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
  const finalizado = estado?.estadoViaje === "finalizado";
  const objetivo = estado?.paradaActual ?? null;
  const paradaObjetivo = objetivo != null ? paradas[objetivo] : null;
  const esUltima = objetivo != null && objetivo === paradas.length - 1;

  const mapaParadas = paradas.map((p) => ({ lat: p.lat, lng: p.lng, descripcion: p.descripcion }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-drivin-ink">Navegación del flete {flete.codigo}</h2>
          <p className="text-sm text-drivin-muted">
            {flete.origen} → {flete.destino}
          </p>
        </div>
        <button
          onClick={() => onSalir()}
          className="rounded-lg border border-drivin-border bg-white px-4 py-2 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg"
        >
          Volver
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-drivin-muted">Cargando…</p>
      ) : (
        <div className="space-y-4">
          <MapaRuta
            paradas={mapaParadas}
            geometria={estado?.rutaGeometria ?? flete.rutaGeometria}
            posicion={posicion ?? (estado?.posLat != null && estado?.posLng != null ? { lat: estado.posLat, lng: estado.posLng } : null)}
            alto="h-96"
          />

          {/* Barra de acción principal */}
          {estado?.estadoViaje === "planeado" && (
            <button
              onClick={async () => {
                const pos = await posicionActual();
                accion({ accion: "iniciar", lat: pos?.lat, lng: pos?.lng });
              }}
              disabled={ocupado}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-base font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <IconoPlay className="h-5 w-5" />
              Iniciar flete
            </button>
          )}

          {enCurso && paradaObjetivo && !esUltima && (
            <button
              onClick={async () => {
                const pos = await posicionActual();
                accion({ accion: "llegada", orden: objetivo, lat: pos?.lat, lng: pos?.lng });
              }}
              disabled={ocupado}
              className="w-full rounded-xl bg-drivin-indigo py-4 text-base font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-60"
            >
              He llegado a: {paradaObjetivo.descripcion}
            </button>
          )}

          {enCurso && esUltima && (
            <button
              onClick={async () => {
                const pos = await posicionActual();
                accion({ accion: "finalizar", lat: pos?.lat, lng: pos?.lng });
              }}
              disabled={ocupado}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-4 text-base font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              <IconoMeta className="h-5 w-5" />
              He llegado al destino — Finalizar flete
            </button>
          )}

          {finalizado && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-base font-bold text-emerald-800">
                <IconoCheck className="h-5 w-5" />
                Flete completado
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-drivin-muted">Duración</p>
                  <p className="font-bold text-drivin-ink">{fmtDuracion(estado?.duracionSeg ?? null)}</p>
                </div>
                <div>
                  <p className="text-drivin-muted">Distancia</p>
                  <p className="font-bold text-drivin-ink">
                    {estado?.kilometros != null ? `${estado.kilometros.toFixed(2)} km` : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
          )}

          {/* Progreso de la ruta */}
          <div className="rounded-xl border border-drivin-border bg-white p-4">
            <p className="mb-3 text-sm font-bold text-drivin-ink">Ruta</p>
            <ol className="space-y-3">
              {paradas.map((p, i) => {
                const llegado = p.horaLlegada != null;
                const esObjetivo = enCurso && i === objetivo;
                const color = colorParada(i, paradas.length);
                return (
                  <li key={p.id} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {llegado ? <IconoCheck className="h-3 w-3" /> : i === 0 ? "A" : i === paradas.length - 1 ? "B" : i}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-drivin-ink">{p.descripcion}</p>
                        {esObjetivo && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            siguiente
                          </span>
                        )}
                      </div>
                      {llegado && (
                        <p className="text-xs text-emerald-700">Llegada: {fmtHora(p.horaLlegada)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
