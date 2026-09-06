"use client";

import { useCallback, useEffect, useState } from "react";
import MapaRuta from "./MapaRuta";
import type { Flete } from "@/lib/tipos";

interface Parada {
  id: string;
  orden: number;
  tipo: "origen" | "intermedio" | "destino";
  descripcion: string;
  lat: number | null;
  lng: number | null;
  kmTramo: number | null;
  horaLlegada: string | null;
  horaSalida: string | null;
}

interface EstadoSeguimiento {
  estadoViaje: string;
  iniciadoEn: string | null;
  finalizadoEn: string | null;
  duracionSeg: number | null;
  kilometros: number | null;
  rutaGeometria: string | null;
}

interface Props {
  documento: string;
  flete: Flete;
  onSalir: () => void;
}

function fmtHora(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "—";
}
function fmtDur(seg: number | null): string {
  if (seg == null || seg < 0) return "—";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
function difSeg(desde: string | null, hasta: string | null): number | null {
  if (!desde || !hasta) return null;
  return Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 1000);
}

export default function DetalleRecorrido({ documento, flete, onSalir }: Props) {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [estado, setEstado] = useState<EstadoSeguimiento | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const params = new URLSearchParams({ documento });
      const res = await fetch(`/api/fletes/${flete.id}/navegacion?${params.toString()}`);
      if (res.ok) {
        const data: { estado: EstadoSeguimiento | null; paradas: Parada[] } = await res.json();
        setParadas(data.paradas);
        setEstado(data.estado);
      }
    } finally {
      setCargando(false);
    }
  }, [documento, flete.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const inicio = estado?.iniciadoEn ?? paradas[0]?.horaSalida ?? null;
  const fin = estado?.finalizadoEn ?? paradas[paradas.length - 1]?.horaLlegada ?? null;
  const duracionTotal = estado?.duracionSeg ?? difSeg(inicio, fin);
  const kmTotal = estado?.kilometros ?? null;
  const velProm = kmTotal != null && duracionTotal && duracionTotal > 0 ? (kmTotal / (duracionTotal / 3600)) : null;

  // Tramos entre paradas consecutivas.
  const tramos = paradas.slice(1).map((p, i) => {
    const prev = paradas[i];
    const salida = prev.horaSalida ?? prev.horaLlegada ?? (i === 0 ? inicio : null);
    const llegada = p.horaLlegada;
    const seg = difSeg(salida, llegada);
    const km = p.kmTramo;
    const vel = km != null && seg && seg > 0 ? km / (seg / 3600) : null;
    return { desde: prev.descripcion, hasta: p.descripcion, km, salida, llegada, seg, vel };
  });

  const mapaParadas = paradas.map((p) => ({ lat: p.lat, lng: p.lng, descripcion: p.descripcion }));

  const Metric = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
    <div className="rounded-lg bg-drivin-bg p-3 text-center">
      <div className="text-lg font-extrabold text-drivin-indigo">{valor}</div>
      <div className="text-xs font-semibold text-drivin-muted">{etiqueta}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-drivin-ink">Detalle del flete {flete.codigo}</h2>
          <p className="text-sm text-drivin-muted">{flete.origen} → {flete.destino}</p>
        </div>
        <button
          onClick={onSalir}
          className="rounded-lg border border-drivin-border bg-white px-4 py-2 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg"
        >
          Volver
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-drivin-muted">Cargando…</p>
      ) : (
        <div className="space-y-4">
          <MapaRuta paradas={mapaParadas} geometria={estado?.rutaGeometria ?? flete.rutaGeometria} alto="h-72" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric etiqueta="Distancia" valor={kmTotal != null ? `${kmTotal.toFixed(2)} km` : "—"} />
            <Metric etiqueta="Duración" valor={fmtDur(duracionTotal)} />
            <Metric etiqueta="Vel. promedio" valor={velProm != null ? `${velProm.toFixed(0)} km/h` : "—"} />
            <Metric etiqueta="Paradas" valor={String(paradas.length)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-drivin-border p-3">
              <div className="text-xs font-semibold text-drivin-muted">Hora de inicio</div>
              <div className="text-base font-bold text-drivin-ink">{fmtHora(inicio)}</div>
            </div>
            <div className="rounded-lg border border-drivin-border p-3">
              <div className="text-xs font-semibold text-drivin-muted">Hora de finalización</div>
              <div className="text-base font-bold text-drivin-ink">{fmtHora(fin)}</div>
            </div>
          </div>

          {/* Tabla de tramos */}
          <div className="overflow-hidden rounded-xl border border-drivin-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-drivin-bg text-left text-xs font-semibold text-drivin-muted">
                  <th className="px-3 py-2">Tramo</th>
                  <th className="px-3 py-2 text-right">Km</th>
                  <th className="px-3 py-2 text-right">Salida</th>
                  <th className="px-3 py-2 text-right">Llegada</th>
                  <th className="px-3 py-2 text-right">Duración</th>
                  <th className="px-3 py-2 text-right">Vel.</th>
                </tr>
              </thead>
              <tbody>
                {tramos.map((t, i) => (
                  <tr key={i} className="border-t border-drivin-border">
                    <td className="px-3 py-2 text-drivin-ink">{t.desde} → {t.hasta}</td>
                    <td className="px-3 py-2 text-right">{t.km != null ? t.km.toFixed(2) : "—"}</td>
                    <td className="px-3 py-2 text-right">{fmtHora(t.salida)}</td>
                    <td className="px-3 py-2 text-right">{fmtHora(t.llegada)}</td>
                    <td className="px-3 py-2 text-right">{fmtDur(t.seg)}</td>
                    <td className="px-3 py-2 text-right">{t.vel != null ? `${t.vel.toFixed(0)} km/h` : "—"}</td>
                  </tr>
                ))}
                {tramos.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-drivin-muted" colSpan={6}>
                      Sin tramos registrados todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
