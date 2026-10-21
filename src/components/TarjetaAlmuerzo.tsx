"use client";

import { useCallback, useEffect, useState } from "react";
import type { EstadoAlmuerzo, PuntosAlmuerzo, SolicitudAlmuerzo } from "@/lib/almuerzos";

const ETIQUETA: Record<EstadoAlmuerzo, string> = {
  pendiente: "Esperando aprobación",
  aprobada: "Aprobado",
  reprogramada: "Reprogramado por Despacho",
  rechazada: "No aceptado",
  cancelada: "Cancelado",
  vencida: "Sin respuesta (vencido)",
  terminada: "Almuerzo terminado",
};

const COLOR: Record<EstadoAlmuerzo, string> = {
  pendiente: "bg-amber-50 text-amber-800 ring-amber-200",
  aprobada: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reprogramada: "bg-blue-50 text-blue-700 ring-blue-200",
  rechazada: "bg-red-50 text-red-700 ring-red-200",
  cancelada: "bg-drivin-bg text-drivin-muted ring-drivin-border",
  vencida: "bg-drivin-bg text-drivin-muted ring-drivin-border",
  terminada: "bg-sky-50 text-sky-700 ring-sky-200",
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Bogota" });

function hoyBogota(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

function sumarHora(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Almuerzo del día: solicitud y estado en (casi) tiempo real desde SIGCOMPRO. */
export default function TarjetaAlmuerzo({ documento }: { documento: string }) {
  const [datos, setDatos] = useState<(PuntosAlmuerzo & { solicitudes: SolicitudAlmuerzo[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [puntoId, setPuntoId] = useState("");
  const [horaInicio, setHoraInicio] = useState("12:00");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmandoDisponible, setConfirmandoDisponible] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/almuerzos?documento=${encodeURIComponent(documento)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo consultar tu almuerzo.");
      setDatos(data);
      setPuntoId((prev) => prev || data.puntos?.[0]?.id || "");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar tu almuerzo.");
    }
  }, [documento]);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void cargar();
    }, 10000);
    const reloj = setInterval(() => setAhora(Date.now()), 30000);
    const alVolver = () => document.visibilityState === "visible" && void cargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/almuerzos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento, puntoId, hora: horaInicio, nota }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar la solicitud.");
      setFormAbierto(false);
      setNota("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud.");
    } finally {
      setEnviando(false);
    }
  }

  async function disponible(id: string) {
    setError(null);
    setConfirmandoDisponible(true);
    try {
      const res = await fetch(`/api/almuerzos/${encodeURIComponent(id)}/disponible`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo confirmar tu disponibilidad.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar tu disponibilidad.");
    } finally { setConfirmandoDisponible(false); }
  }

  const hoy = hoyBogota();
  const deHoy = (datos?.solicitudes ?? []).filter((s) => s.dia === hoy);
  const actual = deHoy.find((s) => ["pendiente", "aprobada", "reprogramada", "terminada"].includes(s.estado));
  const anteriores = deHoy.filter((s) => s !== actual);
  const sinPunto = datos !== null && datos.puntos.length === 0;
  const enCurso =
    actual &&
    (actual.estado === "aprobada" || actual.estado === "reprogramada") &&
    new Date(actual.inicio).getTime() <= ahora &&
    ahora < new Date(actual.fin).getTime();

  return (
    <div className="rounded-xl border border-drivin-border p-5 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-drivin-ink">Mi almuerzo de hoy</h3>
          <p className="text-xs text-drivin-muted">Se actualiza automáticamente con lo que decida Despacho.</p>
        </div>
        {!actual && !sinPunto && datos && !formAbierto && (
          <button
            onClick={() => setFormAbierto(true)}
            className="rounded-lg bg-drivin-indigo px-4 py-2 text-sm font-bold text-white transition hover:bg-drivin-indigoDark"
          >
            Solicitar almuerzo
          </button>
        )}
      </div>

      {!datos && !error && <p className="mt-4 text-sm text-drivin-muted">Consultando…</p>}
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
      {sinPunto && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No estás registrado como domiciliario activo en SIGCOMPRO. Pide a Despacho que te asigne a tu punto de venta.
        </p>
      )}

      {actual && (
        <div className={`mt-4 rounded-lg p-4 ring-1 ${enCurso ? "bg-orange-50 text-orange-800 ring-orange-200" : COLOR[actual.estado]}`}>
          <p className="text-sm font-bold">
            {actual.disponible_en ? "Disponible" : enCurso
              ? `En almuerzo · termina a las ${hora(actual.fin)}`
              : ETIQUETA[actual.estado]}
          </p>
          <p className="mt-1 text-2xl font-extrabold">
            {hora(actual.inicio)} – {hora(actual.fin)}
          </p>
          {actual.estado === "reprogramada" && (
            <p className="mt-1 text-sm">
              Pediste {actual.hora_solicitada} – {sumarHora(actual.hora_solicitada)}; Despacho lo movió a este horario.
            </p>
          )}
          {actual.motivo_reprogramacion && <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-white/70 px-3 py-2 text-sm"><b>Mensaje de {actual.resuelto_por_nombre || "Despacho"}:</b> {actual.motivo_reprogramacion}</p>}
          <p className="mt-1 text-xs">
            {actual.punto_nombre ?? ""}
            {actual.resuelto_por_nombre ? ` · Respondió ${actual.resuelto_por_nombre}` : ""}
          </p>
          {actual.disponible_en && <p className="mt-2 text-sm font-semibold">Confirmaste tu regreso a las {hora(actual.disponible_en)}</p>}
          {!actual.disponible_en && ["aprobada", "reprogramada", "terminada"].includes(actual.estado) && new Date(actual.inicio).getTime() <= ahora && (
            <button
              onClick={() => void disponible(actual.id)}
              disabled={confirmandoDisponible}
              className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {confirmandoDisponible ? "Confirmando…" : "Ya estoy disponible"}
            </button>
          )}
        </div>
      )}

      {formAbierto && datos && (
        <form onSubmit={enviar} className="mt-4 grid gap-3 sm:grid-cols-3">
          {datos.puntos.length > 1 && (
            <label className="text-sm font-semibold text-drivin-ink">
              Punto de venta
              <select
                value={puntoId}
                onChange={(e) => setPuntoId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm font-normal"
              >
                {datos.puntos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm font-semibold text-drivin-ink">
            Hora de inicio
            <input
              type="time"
              required
              min="06:00"
              max="21:00"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm font-normal"
            />
            <span className="mt-1 block text-xs font-normal text-drivin-muted">
              Dura 1 hora: hasta las {sumarHora(horaInicio) || "—"}
            </span>
          </label>
          <label className="text-sm font-semibold text-drivin-ink">
            Nota (opcional)
            <input
              type="text"
              maxLength={300}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="mt-1 w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <div className="flex gap-2 sm:col-span-3 sm:justify-end">
            <button
              type="button"
              onClick={() => setFormAbierto(false)}
              className="rounded-lg border border-drivin-border px-4 py-2 text-sm font-semibold text-drivin-ink"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={enviando || !puntoId}
              className="rounded-lg bg-drivin-indigo px-4 py-2 text-sm font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-60"
            >
              {enviando ? "Enviando…" : "Enviar solicitud"}
            </button>
          </div>
        </form>
      )}

      {anteriores.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-drivin-muted">
          {anteriores.map((s) => (
            <li key={s.id}>
              {s.hora_solicitada} – {sumarHora(s.hora_solicitada)} · {ETIQUETA[s.estado]}
              {s.motivo_rechazo ? ` · Motivo: ${s.motivo_rechazo}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
