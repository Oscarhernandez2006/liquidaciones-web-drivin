"use client";

import { useEffect, useState } from "react";
import type { ConsultaResultado, LiquidacionDetalle, FueraRangoPeriodo } from "@/lib/tipos";
import TarjetaPeriodo from "./TarjetaPeriodo";
import ModuloFletes from "./ModuloFletes";
import ReciboLiquidacion from "./ReciboLiquidacion";
import { moneda } from "@/lib/formato";
import { guardarSesion, obtenerSesion, limpiarSesion } from "@/lib/sesion";
import { DOMICILIARIO_FLETE, esDomiciliarioFlete } from "@/lib/fleteDomiciliario";

type Vista = "form" | "fletes" | "perfil";

export default function ConsultaForm() {
  const [documento, setDocumento] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);
  const [buscado, setBuscado] = useState(false);
  const [cargaInicial, setCargaInicial] = useState(true);
  const [vista, setVista] = useState<Vista>("form");

  // Modal con la lista de liquidaciones.
  const [modalLista, setModalLista] = useState(false);
  // Modal con el detalle de una liquidación.
  const [detalle, setDetalle] = useState<LiquidacionDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // Modal con los períodos de pedidos fuera de rango.
  const [modalFuera, setModalFuera] = useState(false);
  const [fueraPeriodos, setFueraPeriodos] = useState<FueraRangoPeriodo[] | null>(null);
  const [cargandoFuera, setCargandoFuera] = useState(false);
  const [errorFuera, setErrorFuera] = useState<string | null>(null);
  // Modal con el detalle de un período fuera de rango.
  const [fueraDetalle, setFueraDetalle] = useState<FueraRangoPeriodo | null>(null);

  // Al montar: si hay una sesión vigente, carga sus datos.
  useEffect(() => {
    const s = obtenerSesion();
    if (s) {
      setDocumento(s.documento);
      ejecutarConsulta(s.documento).finally(() => setCargaInicial(false));
    } else {
      setCargaInicial(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function abrirDetalle(id: string) {
    setErrorDetalle(null);
    setCargandoDetalle(true);
    setDetalle(null);
    try {
      const res = await fetch(
        `/api/liquidacion/${encodeURIComponent(id)}?documento=${encodeURIComponent(documento)}`
      );
      if (!res.ok) throw new Error("No se pudo cargar el detalle de la liquidación.");
      setDetalle((await res.json()) as LiquidacionDetalle);
    } catch (err) {
      setErrorDetalle(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarDetalle() {
    setDetalle(null);
    setErrorDetalle(null);
    setCargandoDetalle(false);
  }

  async function abrirFueraRango() {
    setModalFuera(true);
    setErrorFuera(null);
    setCargandoFuera(true);
    setFueraPeriodos(null);
    try {
      const res = await fetch("/api/fuera-rango", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento }),
      });
      if (!res.ok) throw new Error("No se pudieron cargar los pedidos fuera de rango.");
      const data = await res.json();
      setFueraPeriodos(data.periodos ?? []);
    } catch (err) {
      setErrorFuera(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCargandoFuera(false);
    }
  }

  function cerrarFuera() {
    setModalFuera(false);
    setFueraPeriodos(null);
    setErrorFuera(null);
    setFueraDetalle(null);
  }

  async function ejecutarConsulta(doc: string) {
    setError(null);
    setCargando(true);
    setResultado(null);

    // El domiciliario especial (fletes) también ve su perfil, con la opción extra de registrar flete.
    if (esDomiciliarioFlete(doc)) {
      guardarSesion(doc);
      setVista("perfil");
    }

    try {
      const res = await fetch("/api/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: doc }),
      });

      if (res.status === 404) {
        setBuscado(true);
        setResultado(null);
        return;
      }
      if (!res.ok) throw new Error("No se pudo consultar. Intenta de nuevo.");

      const data: ConsultaResultado = await res.json();
      guardarSesion(doc);
      setResultado(data);
      setBuscado(true);

      // Mostrar el perfil si tiene liquidaciones o es el domiciliario de fletes.
      if (data.liquidaciones.length > 0 || esDomiciliarioFlete(doc)) {
        setVista("perfil");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCargando(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!documento.trim()) {
      setError("Ingresa tu documento.");
      return;
    }
    setError(null);
    void ejecutarConsulta(documento.trim());
  }

  function salir() {
    limpiarSesion();
    setResultado(null);
    setBuscado(false);
    setDocumento("");
    setError(null);
    setVista("form");
    setModalLista(false);
    cerrarDetalle();
    cerrarFuera();
  }

  const esEspecial = esDomiciliarioFlete(documento);
  // Para el módulo de fletes usa el código de la BD o, si no hay, el configurado.
  const codigoVehiculo = resultado?.domiciliario.codigoVehiculo || DOMICILIARIO_FLETE.codigoVehiculo;

  // Carga inicial desde una sesión vigente.
  if (cargaInicial) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-drivin-border bg-white p-10 shadow-tarjeta">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-drivin-border border-t-drivin-indigo" />
        <p className="text-sm font-medium text-drivin-muted">Cargando tus liquidaciones…</p>
      </div>
    );
  }

  // Módulo de registro de fletes (domiciliario habilitado).
  if (vista === "fletes") {
    return (
      <ModuloFletes
        documento={documento}
        codigoVehiculo={codigoVehiculo.toUpperCase()}
        nombre={resultado?.domiciliario.nombre || DOMICILIARIO_FLETE.nombre}
        onVolver={() => setVista("perfil")}
      />
    );
  }

  // Vista de perfil del domiciliario (pantalla inicial tras iniciar sesión).
  if (vista === "perfil" && (resultado || esEspecial)) {
    // Datos del domiciliario; si es Marlon sin liquidaciones, usa los valores configurados.
    const d = resultado?.domiciliario ?? {
      documento,
      codigoVehiculo: DOMICILIARIO_FLETE.codigoVehiculo,
      nombre: DOMICILIARIO_FLETE.nombre,
      pdv: "",
    };
    const liquidaciones = resultado?.liquidaciones ?? [];
    const totalAcumulado = liquidaciones.reduce((s, l) => s + l.total, 0);
    const tieneLiquidaciones = liquidaciones.length > 0;
    const iniciales = d.nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

    return (
      <>
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-drivin-border bg-white shadow-tarjeta">
        {/* Cabecera con datos principales */}
        <div className="flex flex-col items-center gap-4 bg-drivin-dark px-6 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-drivin-indigo text-2xl font-extrabold text-white">
            {iniciales || "🙍"}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-white">{d.nombre}</h2>
            <p className="mt-1 text-sm text-white/70">
              Domiciliario · {d.pdv || "Sin punto de venta"}
            </p>
          </div>
          <button
            onClick={salir}
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Salir
          </button>
        </div>

        {/* Cuerpo con información y métricas */}
        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* Información del domiciliario */}
          <div className="rounded-xl border border-drivin-border p-5">
            <h3 className="text-base font-bold text-drivin-ink">Información general</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="font-semibold text-drivin-muted">Documento</dt>
                <dd className="text-right text-drivin-ink">{d.documento}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-semibold text-drivin-muted">Código de vehículo</dt>
                <dd className="text-right text-drivin-ink">{d.codigoVehiculo || "No disponible"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-semibold text-drivin-muted">Punto de venta</dt>
                <dd className="text-right text-drivin-ink">{d.pdv || "No disponible"}</dd>
              </div>
            </dl>
          </div>

          {/* Métricas y acceso a liquidaciones */}
          <div className="flex flex-col rounded-xl border border-drivin-border p-5">
            <h3 className="text-base font-bold text-drivin-ink">Mis liquidaciones</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-drivin-bg p-4 text-center">
                <div className="text-2xl font-extrabold text-drivin-indigo">
                  {liquidaciones.length}
                </div>
                <div className="text-xs font-semibold text-drivin-muted">Períodos</div>
              </div>
              <div className="rounded-lg bg-drivin-bg p-4 text-center">
                <div className="text-lg font-extrabold text-drivin-indigo">
                  {moneda(totalAcumulado)}
                </div>
                <div className="text-xs font-semibold text-drivin-muted">Total acumulado</div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => setModalLista(true)}
                disabled={!tieneLiquidaciones}
                className="w-full rounded-lg bg-drivin-indigo py-3 text-sm font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-50"
              >
                {tieneLiquidaciones ? "Ver mis liquidaciones →" : "Sin liquidaciones publicadas"}
              </button>
              <button
                onClick={abrirFueraRango}
                className="w-full rounded-lg border border-amber-500 bg-white py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
              >
                Pedidos fuera de rango
              </button>
              {esEspecial && (
                <button
                  onClick={() => setVista("fletes")}
                  className="w-full rounded-lg border border-drivin-indigo bg-white py-3 text-sm font-bold text-drivin-indigo transition hover:bg-drivin-bg"
                >
                  Registrar flete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: lista de liquidaciones */}
      {modalLista && (
        <ModalOverlay titulo="Mis liquidaciones" onClose={() => setModalLista(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            {liquidaciones.map((l) => (
              <TarjetaPeriodo key={l.id} liquidacion={l} onSelect={abrirDetalle} />
            ))}
          </div>
        </ModalOverlay>
      )}

      {/* Modal: detalle de una liquidación */}
      {(cargandoDetalle || detalle || errorDetalle) && (
        <ModalOverlay titulo="Detalle de la liquidación" onClose={cerrarDetalle}>
          {cargandoDetalle && (
            <div className="flex items-center gap-3 py-8 text-sm text-drivin-muted">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-drivin-border border-t-drivin-indigo" />
              Cargando el detalle…
            </div>
          )}
          {errorDetalle && !cargandoDetalle && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorDetalle}
            </p>
          )}
          {detalle && !cargandoDetalle && <ReciboLiquidacion detalle={detalle} />}
        </ModalOverlay>
      )}

      {/* Modal: lista de períodos con pedidos fuera de rango */}
      {modalFuera && (
        <ModalOverlay titulo="Pedidos fuera de rango" onClose={cerrarFuera}>
          {cargandoFuera && (
            <div className="flex items-center gap-3 py-8 text-sm text-drivin-muted">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-drivin-border border-t-drivin-indigo" />
              Cargando…
            </div>
          )}
          {errorFuera && !cargandoFuera && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorFuera}
            </p>
          )}
          {!cargandoFuera && !errorFuera && fueraPeriodos && fueraPeriodos.length === 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800">
              No tienes pedidos fuera de rango publicados.
            </p>
          )}
          {!cargandoFuera && !errorFuera && fueraPeriodos && fueraPeriodos.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {fueraPeriodos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFueraDetalle(p)}
                  className="group flex flex-col rounded-xl border border-amber-300 bg-amber-50 p-5 text-left transition hover:border-amber-400 hover:bg-amber-100"
                >
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-lg">⚠️</span>
                    <span className="text-sm font-bold text-amber-800">Fuera de rango</span>
                  </div>
                  <div className="mt-3 text-base font-bold leading-snug text-drivin-ink">
                    {p.periodoEtiqueta}
                  </div>
                  <span className="mt-2 w-fit rounded bg-white px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                    {p.rangoFechas}
                  </span>
                  <div className="mt-4 border-t border-amber-200 pt-3">
                    <div className="text-xs font-medium text-amber-700/80">Pedidos fuera de rango</div>
                    <div className="text-2xl font-extrabold text-amber-800">{p.total}</div>
                  </div>
                  <span className="mt-3 text-sm font-semibold text-amber-700 transition group-hover:translate-x-0.5">
                    Ver detalle →
                  </span>
                </button>
              ))}
            </div>
          )}
        </ModalOverlay>
      )}

      {/* Modal: detalle de un período fuera de rango */}
      {fueraDetalle && (
        <ModalOverlay
          titulo={`Fuera de rango · ${fueraDetalle.periodoEtiqueta}`}
          onClose={() => setFueraDetalle(null)}
        >
          <p className="mb-4 text-sm text-drivin-muted">
            {fueraDetalle.rangoFechas} · {fueraDetalle.total} pedido(s) fuera de rango
          </p>
          {fueraDetalle.filas.length === 0 ? (
            <p className="rounded-md bg-drivin-bg px-3 py-3 text-sm text-drivin-muted">
              Sin detalle disponible.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-drivin-border text-left text-drivin-muted">
                    <th className="py-2 pr-4 font-semibold">Fecha</th>
                    <th className="py-2 pr-4 font-semibold">Cliente</th>
                    <th className="py-2 font-semibold">Distancia confirmada</th>
                  </tr>
                </thead>
                <tbody>
                  {fueraDetalle.filas.map((f, i) => (
                    <tr key={i} className="border-b border-drivin-border/60">
                      <td className="py-2 pr-4 font-medium text-drivin-ink">{f.fecha}</td>
                      <td className="py-2 pr-4 text-drivin-ink">{f.nombreCliente}</td>
                      <td className="py-2 text-drivin-ink">{f.distanciaConfirmada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModalOverlay>
      )}
      </>
    );
  }

  return (
    <div className="w-full">
      {/* Formulario de ingreso (sin sesión) */}
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-md rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta"
      >
        <h1 className="text-xl font-bold text-drivin-ink">Consulta tu liquidación</h1>
        <p className="mt-1 text-sm text-drivin-muted">
          Ingresa tu documento para ver tus liquidaciones.
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

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
          )}

          {buscado && !cargando && (!resultado || resultado.liquidaciones.length === 0) && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              No encontramos liquidaciones. Verifica tu documento.
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-drivin-indigo py-2.5 text-sm font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-60"
          >
            {cargando ? "Consultando…" : "Consultar mi liquidación"}
          </button>

          <a
            href="/maestro"
            className="block text-center text-sm font-semibold text-drivin-muted hover:text-drivin-ink"
          >
            Ingreso de usuario maestro
          </a>
        </div>
      </form>
    </div>
  );
}

/** Ventana modal con fondo oscuro y contenido desplazable. */
function ModalOverlay({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-4xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-drivin-border bg-white px-6 py-4">
          <h3 className="text-base font-bold text-drivin-ink">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md px-2 text-2xl leading-none text-drivin-muted transition hover:text-drivin-ink"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
