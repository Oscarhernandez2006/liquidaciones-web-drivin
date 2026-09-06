"use client";

import { useMemo, useState } from "react";
import MapaRuta from "./MapaRuta";
import { IconoMapa, IconoBandera, IconoMeta, IconoMas, IconoCaja, IconoCheck, IconoEquis } from "./Iconos";
import { COLOR_ORIGEN, COLOR_DESTINO, colorIntermedio } from "@/lib/colores";

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
  cargaDescripcion: string | null;
  cargaKilos: number | null;
}

interface Props {
  puntos: PuntoCatalogo[];
  onCambio: (paradas: ParadaRuta[]) => void;
}

/** Primera letra de cada palabra en mayúscula, el resto en minúscula. */
function tituloCase(s: string): string {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export default function ConstructorRuta({ puntos, onCambio }: Props) {
  // Origen + intermedios (origen = índice 0) y destino aparte (siempre al final).
  const [previos, setPrevios] = useState<ParadaRuta[]>([]);
  const [destino, setDestino] = useState<ParadaRuta | null>(null);

  // Selección pendiente por agregar.
  const [seleccion, setSeleccion] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [cargaDesc, setCargaDesc] = useState("");
  const [cargaKilos, setCargaKilos] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const puntoSel = useMemo(
    () => puntos.find((p) => p.descripcion === seleccion) ?? null,
    [puntos, seleccion]
  );

  function emitir(nuevosPrevios: ParadaRuta[], nuevoDestino: ParadaRuta | null) {
    onCambio(nuevoDestino ? [...nuevosPrevios, nuevoDestino] : nuevosPrevios);
  }

  function construirPendiente(incluirCarga: boolean): ParadaRuta | null {
    const desc = (puntoSel?.descripcion ?? nombreNuevo).trim();
    if (!desc) {
      setAviso("Elige un punto del catálogo o escribe un lugar.");
      return null;
    }
    if (incluirCarga && !cargaDesc.trim()) {
      setAviso("Escribe qué entregas en esta parada.");
      return null;
    }
    const kilos = Number(cargaKilos.replace(",", "."));
    return {
      descripcion: desc,
      lat: puntoSel?.lat ?? null,
      lng: puntoSel?.lng ?? null,
      direccion: puntoSel?.direccion ?? null,
      barrio: puntoSel?.barrio ?? null,
      ciudad: puntoSel?.ciudad ?? null,
      establecimiento: puntoSel?.establecimiento ?? null,
      cargaDescripcion: incluirCarga ? cargaDesc.trim() : null,
      cargaKilos: incluirCarga && Number.isFinite(kilos) && cargaKilos.trim() !== "" ? kilos : null,
    };
  }

  function limpiarPendiente() {
    setSeleccion("");
    setNombreNuevo("");
    setCargaDesc("");
    setCargaKilos("");
    setAviso(null);
  }

  function agregarOrigen() {
    const p = construirPendiente(false);
    if (!p) return;
    const np = [p];
    setPrevios(np);
    emitir(np, destino);
    limpiarPendiente();
  }

  function agregarIntermedio() {
    const p = construirPendiente(true);
    if (!p) return;
    const np = [...previos, p];
    setPrevios(np);
    emitir(np, destino);
    limpiarPendiente();
  }

  function marcarDestino() {
    const p = construirPendiente(true);
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

  const hayOrigen = previos.length > 0;
  const paradasFinal: ParadaRuta[] = destino ? [...previos, destino] : previos;
  const totalParadas = paradasFinal.length;

  return (
    <div className="mt-2 rounded-2xl border border-drivin-border bg-gradient-to-b from-white to-drivin-bg/50 p-6 shadow-sm">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-drivin-indigo/10 text-drivin-indigo">
          <IconoMapa className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-drivin-ink">Ruta del flete</h3>
            {totalParadas > 0 && (
              <span className="rounded-full bg-drivin-indigo/10 px-2 py-0.5 text-xs font-bold text-drivin-indigo">
                {totalParadas} {totalParadas === 1 ? "parada" : "paradas"}
              </span>
            )}
          </div>
          <p className="text-sm text-drivin-muted">
            Arma el recorrido: origen, los puntos intermedios y el destino.
          </p>
        </div>
      </div>

      {/* Línea de tiempo de paradas */}
      {paradasFinal.length > 0 && (
        <ol className="relative mt-5 space-y-4 pl-1">
          {paradasFinal.map((p, i) => {
            const esOrigen = i === 0;
            const esDestino = destino != null && i === paradasFinal.length - 1;
            const color = esOrigen ? COLOR_ORIGEN : esDestino ? COLOR_DESTINO : colorIntermedio(i - 1);
            const etiqueta = esOrigen ? "ORIGEN" : esDestino ? "DESTINO" : `PARADA ${i}`;
            const inicial = esOrigen ? "A" : esDestino ? "B" : String(i);
            const noEsUltimo = i < paradasFinal.length - 1;
            return (
              <li key={`${p.descripcion}-${i}`} className="relative flex items-start gap-3">
                {noEsUltimo && (
                  <span
                    className="absolute left-[15px] top-8 h-[calc(100%+2px)] w-0.5"
                    style={{ backgroundColor: "#E5E7EB" }}
                  />
                )}
                <span
                  className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white shadow"
                  style={{ backgroundColor: color }}
                >
                  {inicial}
                </span>
                {(esOrigen || esDestino) && (
                  <span className="mt-1.5 shrink-0" style={{ color }} title={esOrigen ? "Inicio" : "Meta"}>
                    {esOrigen ? <IconoBandera className="h-4 w-4" /> : <IconoMeta className="h-4 w-4" />}
                  </span>
                )}
                <div className="min-w-0 flex-1 rounded-xl border border-drivin-border bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold tracking-wide" style={{ color }}>
                      {etiqueta}
                    </span>
                    {p.lat == null && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        sin ubicación
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-bold text-drivin-ink">{p.descripcion}</p>
                  {p.direccion && <p className="truncate text-xs text-drivin-muted">{p.direccion}</p>}
                  {p.cargaDescripcion && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-drivin-indigo">
                      <IconoCaja className="h-3.5 w-3.5" />
                      {p.cargaDescripcion}
                      {p.cargaKilos != null ? ` · ${p.cargaKilos} kg` : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => (esDestino ? quitarDestino() : quitarPrevio(i))}
                  className="mt-1 shrink-0 rounded-lg px-2 py-1 text-drivin-muted transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Quitar parada"
                  title="Quitar"
                >
                  <IconoEquis className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {/* Selector de la parada pendiente */}
      {!destino && (
        <div className="mt-5 rounded-xl border border-drivin-indigo/30 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-bold text-drivin-ink">
            {hayOrigen ? "¿A dónde sigue?" : "¿De dónde sale?"}
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
            <select
              value={seleccion}
              onChange={(e) => {
                setSeleccion(e.target.value);
                if (e.target.value) setNombreNuevo("");
              }}
              className="w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm text-drivin-ink outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20"
            >
              <option value="">Elegir del catálogo…</option>
              {puntos.map((p) => (
                <option key={p.descripcion} value={p.descripcion}>
                  {p.descripcion}
                  {p.lat != null ? "  ·  ubicado" : ""}
                </option>
              ))}
            </select>
            <span className="hidden items-center justify-center text-xs font-semibold text-drivin-muted sm:flex">
              o
            </span>
            <input
              value={nombreNuevo}
              onChange={(e) => {
                setNombreNuevo(tituloCase(e.target.value));
                if (e.target.value) setSeleccion("");
              }}
              placeholder="Escribe un lugar nuevo"
              className="w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20"
            />
          </div>

          {hayOrigen && (
            <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr]">
              <input
                value={cargaDesc}
                onChange={(e) => setCargaDesc(tituloCase(e.target.value))}
                placeholder="¿Qué entregas aquí?"
                className="w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20"
              />
              <input
                value={cargaKilos}
                onChange={(e) => setCargaKilos(e.target.value.replace(/[^0-9.,]/g, ""))}
                inputMode="decimal"
                placeholder="Kilos"
                className="w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20"
              />
            </div>
          )}

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {!hayOrigen ? (
              <button
                type="button"
                onClick={agregarOrigen}
                className="col-span-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Marcar como origen
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={agregarIntermedio}
                  className="flex items-center justify-center gap-2 rounded-xl bg-drivin-indigo py-3 text-sm font-bold text-white shadow-sm transition hover:bg-drivin-indigoDark"
                >
                  <IconoMas className="h-4 w-4" />
                  Agregar parada
                </button>
                <button
                  type="button"
                  onClick={marcarDestino}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
                >
                  <IconoMeta className="h-4 w-4" />
                  Marcar destino
                </button>
              </>
            )}
          </div>

          {aviso && <p className="mt-2 text-xs font-semibold text-red-600">{aviso}</p>}
        </div>
      )}

      {destino && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3">
          <span className="text-emerald-600">
            <IconoCheck className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-emerald-800">
            Ruta lista con {totalParadas} paradas. Quita el destino para seguir agregando.
          </p>
        </div>
      )}

      {paradasFinal.some((p) => p.lat != null) && (
        <div className="mt-4">
          <MapaRuta
            paradas={paradasFinal.map((p) => ({ lat: p.lat, lng: p.lng, descripcion: p.descripcion }))}
            alto="h-64"
          />
          <p className="mt-1 text-[11px] text-drivin-muted">
            Vista previa. La ruta exacta por carretera y los kilómetros se calculan al registrar el flete.
          </p>
        </div>
      )}
    </div>
  );
}
