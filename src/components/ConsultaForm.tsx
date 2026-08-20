"use client";

import { useEffect, useState } from "react";
import type { ConsultaResultado } from "@/lib/tipos";
import TarjetaPeriodo from "./TarjetaPeriodo";
import { guardarSesion, obtenerSesion, limpiarSesion } from "@/lib/sesion";

export default function ConsultaForm() {
  const [documento, setDocumento] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);
  const [buscado, setBuscado] = useState(false);
  const [cargaInicial, setCargaInicial] = useState(true);

  // Al montar: si hay una sesión vigente, muestra las liquidaciones sin volver a pedir los datos.
  useEffect(() => {
    const s = obtenerSesion();
    if (s) {
      setDocumento(s.documento);
      setCodigo(s.codigoVehiculo);
      ejecutarConsulta(s.documento, s.codigoVehiculo).finally(() => setCargaInicial(false));
    } else {
      setCargaInicial(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ejecutarConsulta(doc: string, cod: string) {
    setError(null);
    setCargando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: doc, codigoVehiculo: cod }),
      });

      if (res.status === 404) {
        setBuscado(true);
        setResultado(null);
        return;
      }
      if (!res.ok) throw new Error("No se pudo consultar. Intenta de nuevo.");

      const data: ConsultaResultado = await res.json();
      guardarSesion(doc, cod);
      setResultado(data);
      setBuscado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCargando(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!documento.trim() || !codigo.trim()) {
      setError("Ingresa tu documento y tu código de vehículo.");
      return;
    }
    void ejecutarConsulta(documento.trim(), codigo.trim());
  }

  function salir() {
    limpiarSesion();
    setResultado(null);
    setBuscado(false);
    setDocumento("");
    setCodigo("");
    setError(null);
  }

  const sesionActiva = !!resultado && resultado.liquidaciones.length > 0;

  // Carga inicial desde una sesión vigente.
  if (cargaInicial) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-drivin-border bg-white p-10 shadow-tarjeta">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-drivin-border border-t-drivin-indigo" />
        <p className="text-sm font-medium text-drivin-muted">Cargando tus liquidaciones…</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Liquidaciones (sesión activa): tarjetas + salir */}
      {sesionActiva && (
        <section className="mx-auto max-w-4xl">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-drivin-ink">
                Hola, {resultado!.domiciliario.nombre}
              </h2>
              <p className="text-sm text-drivin-muted">
                Tienes {resultado!.liquidaciones.length} liquidación(es). Toca una para ver el detalle.
              </p>
            </div>
            <button
              onClick={salir}
              className="rounded-lg border border-drivin-border bg-white px-4 py-2 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg"
            >
              Salir
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resultado!.liquidaciones.map((l) => (
              <TarjetaPeriodo key={l.id} liquidacion={l} />
            ))}
          </div>
        </section>
      )}

      {/* Formulario (sin sesión activa) */}
      {!sesionActiva && (
        <form
          onSubmit={onSubmit}
          className="mx-auto max-w-md rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta"
        >
          <h1 className="text-xl font-bold text-drivin-ink">Consulta tu liquidación</h1>
          <p className="mt-1 text-sm text-drivin-muted">
            Ingresa tu documento y tu código de vehículo para ver tus liquidaciones.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-drivin-ink">Documento</label>
              <input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-drivin-ink">
                Código de vehículo
              </label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm uppercase outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
            )}

            {buscado && !cargando && (!resultado || resultado.liquidaciones.length === 0) && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                No encontramos liquidaciones. Verifica tu documento y código de vehículo.
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-drivin-indigo py-2.5 text-sm font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-60"
            >
              {cargando ? "Consultando…" : "Consultar mi liquidación"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
