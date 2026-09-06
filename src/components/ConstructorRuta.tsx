"use client";

import { useMemo, useState } from "react";
import MapaRuta from "./MapaRuta";

/** Un punto del catálogo (puntos de referencia) con su ubicación resuelta. */
export interface PuntoCatalogo {
  descripcion: string;
  lat: number | null;
  lng: number | null;
  direccion: string | null;
  barrio: string | null;
  ciudad: string | null;
  establecimiento: string | null;
}

/** Una parada de la ruta que se está construyendo. */
export interface ParadaRuta {
  descripcion: string;
  lat: number | null;
  lng: number | null;
  direccion: string | null;
  barrio: string | null;
  ciudad: string | null;
  establecimiento: string | null;
}

interface Props {
  puntos: PuntoCatalogo[];
  onCambio: (paradas: ParadaRuta[]) => void;
}

function capturarGps(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalización no disponible en este dispositivo."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("No se pudo obtener la ubicación.")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function ConstructorRuta({ puntos, onCambio }: Props) {
  // Origen + intermedios (origen = índice 0) y destino aparte (siempre al final).
  const [previos, setPrevios] = useState<ParadaRuta[]>([]);
  const [destino, setDestino] = useState<ParadaRuta | null>(null);

  // Selección pendiente por agregar.
  const [seleccion, setSeleccion] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [capturando, setCapturando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const puntoSel = useMemo(
    () => puntos.find((p) => p.descripcion === seleccion) ?? null,
    [puntos, seleccion]
  );

  function emitir(nuevosPrevios: ParadaRuta[], nuevoDestino: ParadaRuta | null) {
    onCambio(nuevoDestino ? [...nuevosPrevios, nuevoDestino] : nuevosPrevios);
  }

  function construirPendiente(): ParadaRuta | null {
    const desc = (puntoSel?.descripcion ?? nombreNuevo).trim();
    if (!desc) {
      setAviso("Elige un punto del catálogo o escribe un nombre.");
      return null;
    }
    // Coordenadas: GPS capturado tiene prioridad; si no, las del catálogo.
    const lat = gps?.lat ?? puntoSel?.lat ?? null;
    const lng = gps?.lng ?? puntoSel?.lng ?? null;
    return {
      descripcion: desc,
      lat,
      lng,
      direccion: gps ? null : puntoSel?.direccion ?? null,
      barrio: gps ? null : puntoSel?.barrio ?? null,
      ciudad: gps ? null : puntoSel?.ciudad ?? null,
      establecimiento: gps ? null : puntoSel?.establecimiento ?? null,
    };
  }

  function limpiarPendiente() {
    setSeleccion("");
    setNombreNuevo("");
    setGps(null);
    setAviso(null);
  }

  function agregarOrigen() {
    const p = construirPendiente();
    if (!p) return;
    const np = [p];
    setPrevios(np);
    emitir(np, destino);
    limpiarPendiente();
  }

  function agregarIntermedio() {
    const p = construirPendiente();
    if (!p) return;
    const np = [...previos, p];
    setPrevios(np);
    emitir(np, destino);
    limpiarPendiente();
  }

  function marcarDestino() {
    const p = construirPendiente();
    if (!p) return;
    setDestino(p);
    emitir(previos, p);
    limpiarPendiente();
  }

  function quitarPrevio(i: number) {
    const np = previos.filter((_, idx) => idx !== i);
    setPrevios(np);
    emitir(np, destino);
  }

  function quitarDestino() {
    setDestino(null);
    emitir(previos, null);
  }

  async function tomarGps() {
    setAviso(null);
    setCapturando(true);
    try {
      setGps(await capturarGps());
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Error de ubicación.");
    } finally {
      setCapturando(false);
    }
  }

  const hayOrigen = previos.length > 0;
  const paradasFinal: ParadaRuta[] = destino ? [...previos, destino] : previos;

  const chip =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold";

  return (
    <div className="rounded-xl border border-drivin-border p-4">
      <p className="text-sm font-bold text-drivin-ink">Ruta del flete</p>
      <p className="mt-0.5 text-xs text-drivin-muted">
        Agrega el origen, los puntos intermedios y el destino en orden.
      </p>

      {/* Línea de tiempo de paradas */}
      {paradasFinal.length > 0 && (
        <ol className="mt-3 space-y-2">
          {paradasFinal.map((p, i) => {
            const esOrigen = i === 0;
            const esDestino = destino != null && i === paradasFinal.length - 1;
            const color = esOrigen ? "#16A34A" : esDestino ? "#DC2626" : "#6366F1";
            const etiqueta = esOrigen ? "Origen" : esDestino ? "Destino" : `Punto ${i}`;
            const puedeQuitar = esDestino ? true : !esOrigen || paradasFinal.length === 1 || !destino;
            return (
              <li key={`${p.descripcion}-${i}`} className="flex items-start gap-3">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold" style={{ color }}>{etiqueta}</span>
                    {p.lat == null && (
                      <span className={`${chip} bg-amber-100 text-amber-700`}>sin ubicación</span>
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold text-drivin-ink">{p.descripcion}</p>
                  {p.direccion && <p className="truncate text-xs text-drivin-muted">{p.direccion}</p>}
                </div>
                {puedeQuitar && (
                  <button
                    type="button"
                    onClick={() => (esDestino ? quitarDestino() : quitarPrevio(i))}
                    className="shrink-0 rounded-md px-2 py-0.5 text-sm font-bold text-drivin-muted transition hover:bg-drivin-bg hover:text-red-600"
                    aria-label="Quitar parada"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Selector de la parada pendiente */}
      {!destino && (
        <div className="mt-3 rounded-lg border border-dashed border-drivin-border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={seleccion}
              onChange={(e) => {
                setSeleccion(e.target.value);
                setGps(null);
              }}
              className="w-full rounded-lg border border-drivin-border px-3 py-2 text-sm outline-none focus:border-drivin-indigo"
            >
              <option value="">Elegir del catálogo…</option>
              {puntos.map((p) => (
                <option key={p.descripcion} value={p.descripcion}>
                  {p.descripcion}
                  {p.lat != null ? "  •  ubicado" : ""}
                </option>
              ))}
            </select>
            <input
              value={nombreNuevo}
              onChange={(e) => {
                setNombreNuevo(e.target.value);
                if (e.target.value) setSeleccion("");
              }}
              placeholder="…o escribe un lugar nuevo"
              className="w-full rounded-lg border border-drivin-border px-3 py-2 text-sm outline-none focus:border-drivin-indigo"
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={tomarGps}
              disabled={capturando}
              className="rounded-lg border border-drivin-indigo bg-white px-3 py-1.5 text-xs font-bold text-drivin-indigo transition hover:bg-drivin-bg disabled:opacity-60"
            >
              {capturando ? "Ubicando…" : gps ? "Ubicación tomada ✓" : "📍 Usar mi ubicación"}
            </button>
            {gps && (
              <span className="text-[11px] text-drivin-muted">
                {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {!hayOrigen ? (
              <button
                type="button"
                onClick={agregarOrigen}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Marcar como origen
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={agregarIntermedio}
                  className="rounded-lg bg-drivin-indigo px-4 py-2 text-sm font-bold text-white transition hover:bg-drivin-indigoDark"
                >
                  ＋ Punto intermedio
                </button>
                <button
                  type="button"
                  onClick={marcarDestino}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  🏁 Marcar destino
                </button>
              </>
            )}
          </div>

          {aviso && <p className="mt-2 text-xs font-medium text-red-600">{aviso}</p>}
        </div>
      )}

      {destino && (
        <p className="mt-3 text-xs font-medium text-emerald-700">
          Ruta completa: {paradasFinal.length} paradas. Quita el destino para seguir agregando.
        </p>
      )}

      {paradasFinal.some((p) => p.lat != null) && (
        <div className="mt-3">
          <MapaRuta
            paradas={paradasFinal.map((p) => ({ lat: p.lat, lng: p.lng, descripcion: p.descripcion }))}
          />
          <p className="mt-1 text-[11px] text-drivin-muted">
            Vista previa. La ruta exacta por carretera y los kilómetros se calculan al registrar el flete.
          </p>
        </div>
      )}
    </div>
  );
}
