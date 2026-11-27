"use client";

import { useCallback, useEffect, useState } from "react";
import type { EstadoExtension, SolicitudExtension } from "@/lib/extensiones";

const ETIQUETA: Record<EstadoExtension, string> = {
  pendiente: "Solicitada por Despacho · esperando aprobación",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada por Despacho",
  vencida: "Sin respuesta (vencida)",
  cerrada: "Aprobada · cerrada",
};

const COLOR: Record<EstadoExtension, string> = {
  pendiente: "bg-amber-50 text-amber-800 ring-amber-200",
  aprobada: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rechazada: "bg-red-50 text-red-700 ring-red-200",
  cancelada: "bg-drivin-bg text-drivin-muted ring-drivin-border",
  vencida: "bg-drivin-bg text-drivin-muted ring-drivin-border",
  cerrada: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const fechaHora = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Bogota",
      })
    : "";

const dia = (yyyyMmDd: string) => {
  const [y, m, d] = yyyyMmDd.split("-");
  return `${d}/${m}/${y}`;
};

const pesos = (n: number) => `$ ${n.toLocaleString("es-CO")}`;

/** Extensiones de horario: lo que pidió Despacho y lo que se resolvió, en (casi) tiempo real. */
export default function TarjetaExtensiones({ documento }: { documento: string }) {
  const [lista, setLista] = useState<SolicitudExtension[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verTodas, setVerTodas] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/extensiones?documento=${encodeURIComponent(documento)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudieron consultar tus extensiones.");
      setLista(data.extensiones ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron consultar tus extensiones.");
    }
  }, [documento]);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void cargar();
    }, 15000);
    const alVolver = () => document.visibilityState === "visible" && void cargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  // Sin extensiones recientes no se ocupa espacio en la pantalla.
  if (!error && (!lista || lista.length === 0)) return null;

  const visibles = verTodas ? lista ?? [] : (lista ?? []).slice(0, 4);

  return (
    <div className="rounded-xl border border-drivin-border p-4 sm:p-5 md:col-span-2">
      <div>
        <h3 className="text-base font-bold text-drivin-ink">Mis extensiones de horario</h3>
        <p className="text-xs text-drivin-muted">Se actualiza automáticamente cuando Despacho la solicita y cuando se aprueba o rechaza.</p>
      </div>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

      <ul className="mt-4 space-y-2">
        {visibles.map((e) => (
          <li key={e.id} className={`rounded-lg p-3 ring-1 ${COLOR[e.estado]}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-bold">
                {dia(e.dia)} · {ETIQUETA[e.estado]}
              </p>
              {(e.estado === "aprobada" || e.estado === "cerrada") && (
                <p className="text-sm font-bold">
                  {pesos(e.valor)}
                  <span className="ml-1 text-xs font-normal">
                    · {e.pedidos} pedido{e.pedidos === 1 ? "" : "s"}
                  </span>
                </p>
              )}
            </div>
            <p className="mt-1 text-xs">
              {e.punto_venta ?? ""}
              {e.solicitado_por ? ` · Solicitó ${e.solicitado_por} (${fechaHora(e.solicitado_en)})` : ""}
              {e.resuelto_por && e.estado !== "pendiente"
                ? ` · ${e.estado === "rechazada" ? "Rechazó" : e.estado === "cancelada" ? "Canceló" : "Aprobó"} ${e.resuelto_por} (${fechaHora(e.resuelto_en)})`
                : ""}
            </p>
            {e.estado === "rechazada" && e.motivo_rechazo && (
              <p className="mt-2 whitespace-pre-wrap break-words rounded-md bg-white/70 px-3 py-2 text-xs">
                <b>Motivo del rechazo:</b> {e.motivo_rechazo}
              </p>
            )}
          </li>
        ))}
      </ul>

      {(lista?.length ?? 0) > 4 && (
        <button
          onClick={() => setVerTodas((v) => !v)}
          className="mt-3 text-xs font-semibold text-drivin-indigo hover:underline"
        >
          {verTodas ? "Ver menos" : `Ver todas (${lista?.length})`}
        </button>
      )}
    </div>
  );
}
