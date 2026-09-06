"use client";

import { useEffect, useState } from "react";
import type { Flete } from "@/lib/tipos";
import { numero } from "@/lib/formato";
import SelectorBuscable from "./SelectorBuscable";
import ConstructorRuta, { type ParadaRuta, type PuntoCatalogo } from "./ConstructorRuta";
import NavegacionFlete from "./NavegacionFlete";
import DetalleRecorrido from "./DetalleRecorrido";
import { generarPdfFletesDiarios } from "@/lib/pdfFletes";

// Puntos disponibles para origen y destino de un flete.
const PUNTOS = [
  "Pdv La 70",
  "Pdv Malambo",
  "Mangonizate",
  "Oficina Carnes Santacruz",
  "Pdv Concord",
  "Agropecuaria",
  "Pdv Alameda 1",
  "Pdv San Felipe",
  "Pdv Simon",
  "Pdv La 93",
  "Pdv Alameda 2",
  "Restaurante La 43",
  "Pdv Centro",
  "Salsamentaria",
  "Pdv La 43",
  "Restaurante Malambo",
] as const;

function hoyISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 10);
}

/** Solo dígitos y una coma decimal; el punto se convierte en coma. */
function normalizarCantidad(v: string): string {
  let s = v.replace(/\./g, ",").replace(/[^0-9,]/g, "");
  const i = s.indexOf(",");
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/,/g, "");
  return s;
}

/** Distancia en kilómetros entre dos coordenadas (fórmula de Haversine). */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Obtiene la ubicación actual del dispositivo. */
function capturarUbicacion(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalización no disponible en este dispositivo."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Permiso de ubicación denegado."
              : "No se pudo obtener la ubicación."
          )
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/** Extrae el mensaje de error del cuerpo JSON de la respuesta, o usa el mensaje por defecto. */
async function mensajeError(res: Response, porDefecto: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || porDefecto;
  } catch {
    return porDefecto;
  }
}

interface GeoValor {
  oLat: number | null;
  oLng: number | null;
  dLat: number | null;
  dLng: number | null;
}

interface CapturaProps extends GeoValor {
  onOrigen: (lat: number, lng: number) => void;
  onDestino: (lat: number, lng: number) => void;
}

/** Botones para tomar la geolocalización de origen/destino y ver los km recorridos. */
function CapturaUbicaciones(p: CapturaProps) {
  const [cargando, setCargando] = useState<"origen" | "destino" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function tomar(cual: "origen" | "destino") {
    setError(null);
    setCargando(cual);
    try {
      const { lat, lng } = await capturarUbicacion();
      if (cual === "origen") p.onOrigen(lat, lng);
      else p.onDestino(lat, lng);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de ubicación.");
    } finally {
      setCargando(null);
    }
  }

  const km =
    p.oLat != null && p.oLng != null && p.dLat != null && p.dLng != null
      ? distanciaKm(p.oLat, p.oLng, p.dLat, p.dLng)
      : null;
  const fmt = (v: number | null) => (v == null ? "—" : v.toFixed(6));

  const btn =
    "rounded-lg border border-drivin-indigo bg-white py-2 text-xs font-bold text-drivin-indigo transition hover:bg-drivin-bg disabled:opacity-60";

  return (
    <div className="rounded-lg border border-drivin-border p-3">
      <p className="mb-2 text-sm font-semibold text-drivin-ink">
        Geolocalización (kilómetros recorridos)
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => tomar("origen")} disabled={cargando !== null} className={btn}>
          {cargando === "origen"
            ? "Tomando…"
            : p.oLat != null
              ? "Origen ✓ (volver a tomar)"
              : "Tomar ubicación origen"}
        </button>
        <button type="button" onClick={() => tomar("destino")} disabled={cargando !== null} className={btn}>
          {cargando === "destino"
            ? "Tomando…"
            : p.dLat != null
              ? "Destino ✓ (volver a tomar)"
              : "Tomar ubicación destino"}
        </button>
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-drivin-muted">
        <p>
          Origen: {fmt(p.oLat)}, {fmt(p.oLng)}
        </p>
        <p>
          Destino: {fmt(p.dLat)}, {fmt(p.dLng)}
        </p>
      </div>
      {km != null && (
        <p className="mt-1 text-sm font-bold text-drivin-indigo">Distancia: {km.toFixed(2)} km</p>
      )}
      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}

interface Props {
  documento: string;
  codigoVehiculo: string;
  nombre: string;
  onVolver: () => void;
  tituloClaro?: boolean;
}

export default function ModuloFletes({ documento, codigoVehiculo, nombre, onVolver, tituloClaro = true }: Props) {
  const [fletes, setFletes] = useState<Flete[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const [fecha, setFecha] = useState(hoyISO());
  const [descripcion, setDescripcion] = useState("");
  const [kilos, setKilos] = useState("");

  // Puntos de referencia administrados desde la app (origen/destino).
  const [puntosOrigen, setPuntosOrigen] = useState<string[]>([]);
  const [puntosDestino, setPuntosDestino] = useState<string[]>([]);

  // Catálogo completo (con coordenadas) para el constructor de ruta.
  const [catalogo, setCatalogo] = useState<PuntoCatalogo[]>([]);
  const [paradasRuta, setParadasRuta] = useState<ParadaRuta[]>([]);
  const [resetRuta, setResetRuta] = useState(0);

  // Navegación en vivo del flete seleccionado.
  const [navegando, setNavegando] = useState<Flete | null>(null);
  // Detalle/analítica de un flete finalizado.
  const [detalle, setDetalle] = useState<Flete | null>(null);

  // Ubicaciones personalizadas creadas por el usuario.
  const [ubicacionesPersonalizadas, setUbicacionesPersonalizadas] = useState<string[]>([]);

  // Modal de edición.
  const [editando, setEditando] = useState<Flete | null>(null);
  const [eFecha, setEFecha] = useState("");
  const [eOrigen, setEOrigen] = useState("");
  const [eDestino, setEDestino] = useState("");
  const [eDescripcion, setEDescripcion] = useState("");
  const [eKilos, setEKilos] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  // Modal de geolocalización (por flete ya registrado).
  const [geoFlete, setGeoFlete] = useState<Flete | null>(null);
  const [gOLat, setGOLat] = useState<number | null>(null);
  const [gOLng, setGOLng] = useState<number | null>(null);
  const [gDLat, setGDLat] = useState<number | null>(null);
  const [gDLng, setGDLng] = useState<number | null>(null);
  const [guardandoGeo, setGuardandoGeo] = useState(false);
  const [errorGeo, setErrorGeo] = useState<string | null>(null);

  // Modal de confirmación para marcar como terminado.
  const [confirmarFlete, setConfirmarFlete] = useState<Flete | null>(null);
  const [guardandoConfirmar, setGuardandoConfirmar] = useState(false);

  const [busqueda, setBusqueda] = useState("");

  // Envío a liquidación.
  const [mostrarEnvio, setMostrarEnvio] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cargarLista() {
    setCargandoLista(true);
    try {
      const params = new URLSearchParams({ documento, codigoVehiculo });
      const res = await fetch(`/api/fletes?${params.toString()}`);
      if (!res.ok) throw new Error(await mensajeError(res, "No se pudieron cargar los fletes."));
      const data: { fletes: Flete[] } = await res.json();
      setFletes(data.fletes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCargandoLista(false);
    }
  }

  useEffect(() => {
    void cargarLista();
    void cargarPuntosReferencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarPuntosReferencia() {
    try {
      const params = new URLSearchParams({ documento, codigoVehiculo });
      const res = await fetch(`/api/puntos-referencia?${params.toString()}`);
      if (!res.ok) return;
      const data: { puntos: { descripcion: string; aplicaOrigen: boolean; aplicaDestino: boolean; lat: number | null; lng: number | null; direccion: string | null; barrio: string | null; ciudad: string | null; establecimiento: string | null }[] } =
        await res.json();
      setPuntosOrigen(data.puntos.filter((p) => p.aplicaOrigen).map((p) => p.descripcion));
      setPuntosDestino(data.puntos.filter((p) => p.aplicaDestino).map((p) => p.descripcion));
      setCatalogo(
        data.puntos.map((p) => ({
          descripcion: p.descripcion,
          lat: p.lat,
          lng: p.lng,
          direccion: p.direccion,
          barrio: p.barrio,
          ciudad: p.ciudad,
          establecimiento: p.establecimiento,
        }))
      );
    } catch {
      // Si falla, se sigue solo con los puntos fijos y personalizados.
    }
  }

  function limpiarFormulario() {
    setFecha(hoyISO());
    setDescripcion("");
    setKilos("");
    setParadasRuta([]);
    setResetRuta((k) => k + 1);
  }

  function crearUbicacion(nombreUbicacion: string) {
    const normalizado = nombreUbicacion.trim();
    if (!normalizado) return;

    // Evitar duplicados (case-insensitive)
    const yaExiste =
      PUNTOS.some(p => p.toLowerCase() === normalizado.toLowerCase()) ||
      ubicacionesPersonalizadas.some(u => u.toLowerCase() === normalizado.toLowerCase());

    if (!yaExiste) {
      setUbicacionesPersonalizadas(prev => [...prev, normalizado]);
    }
  }

  function abrirEdicion(f: Flete) {
    setEditando(f);
    setEFecha(f.fecha);
    setEOrigen(f.origen);
    setEDestino(f.destino);
    setEDescripcion(f.descripcion);
    setEKilos(String(f.kilos));
    setErrorEdicion(null);
  }

  function cerrarEdicion() {
    setEditando(null);
    setErrorEdicion(null);
  }

  async function eliminar(id: string) {
    if (typeof window !== "undefined" && !window.confirm("¿Eliminar este flete?")) return;
    setError(null);
    setEliminandoId(id);
    try {
      const params = new URLSearchParams({ documento, codigoVehiculo });
      const res = await fetch(`/api/fletes/${id}?${params.toString()}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await mensajeError(res, "No se pudo eliminar el flete."));
      setFletes((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEliminandoId(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fecha || !descripcion.trim()) {
      setError("Completa la fecha y la descripción.");
      return;
    }
    if (paradasRuta.length < 2) {
      setError("La ruta necesita al menos un origen y un destino.");
      return;
    }
    const kilosNum = Number(kilos.replace(",", "."));
    if (!Number.isFinite(kilosNum) || kilosNum < 0) {
      setError("Ingresa un valor válido de kilos.");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/fletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documento,
          codigoVehiculo,
          fecha,
          descripcion: descripcion.trim(),
          kilos: kilosNum,
          paradas: paradasRuta.map((p) => ({
            descripcion: p.descripcion,
            lat: p.lat,
            lng: p.lng,
            direccion: p.direccion,
            barrio: p.barrio,
            ciudad: p.ciudad,
            establecimiento: p.establecimiento,
          })),
        }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, "No se pudo registrar el flete."));
      const data: { flete: Flete } = await res.json();
      setFletes((prev) => [data.flete, ...prev]);
      limpiarFormulario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setGuardando(false);
    }
  }

  async function onSubmitEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setErrorEdicion(null);

    if (!eFecha || !eOrigen.trim() || !eDestino.trim() || !eDescripcion.trim()) {
      setErrorEdicion("Completa fecha, origen, destino y descripción.");
      return;
    }
    const kilosNum = Number(eKilos.replace(",", "."));
    if (!Number.isFinite(kilosNum) || kilosNum < 0) {
      setErrorEdicion("Ingresa un valor válido de kilos.");
      return;
    }

    setGuardandoEdicion(true);
    try {
      const res = await fetch(`/api/fletes/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documento,
          codigoVehiculo,
          fecha: eFecha,
          origen: eOrigen.trim(),
          destino: eDestino.trim(),
          descripcion: eDescripcion.trim(),
          kilos: kilosNum,
          origenLat: editando.origenLat,
          origenLng: editando.origenLng,
          destinoLat: editando.destinoLat,
          destinoLng: editando.destinoLng,
          kilometros: editando.kilometros,
          completado: editando.completado,
        }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, "No se pudo actualizar el flete."));
      const data: { flete: Flete } = await res.json();
      setFletes((prev) => prev.map((f) => (f.id === data.flete.id ? data.flete : f)));
      cerrarEdicion();
    } catch (err) {
      setErrorEdicion(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setGuardandoEdicion(false);
    }
  }

  function abrirGeo(f: Flete) {
    setGeoFlete(f);
    setGOLat(f.origenLat);
    setGOLng(f.origenLng);
    setGDLat(f.destinoLat);
    setGDLng(f.destinoLng);
    setErrorGeo(null);
  }

  function cerrarGeo() {
    setGeoFlete(null);
    setErrorGeo(null);
  }

  async function guardarGeo() {
    if (!geoFlete) return;
    setErrorGeo(null);
    setGuardandoGeo(true);
    try {
      const kilometros =
        gOLat != null && gOLng != null && gDLat != null && gDLng != null
          ? Number(distanciaKm(gOLat, gOLng, gDLat, gDLng).toFixed(2))
          : null;
      const res = await fetch(`/api/fletes/${geoFlete.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documento,
          codigoVehiculo,
          fecha: geoFlete.fecha,
          origen: geoFlete.origen,
          destino: geoFlete.destino,
          descripcion: geoFlete.descripcion,
          kilos: geoFlete.kilos,
          origenLat: gOLat,
          origenLng: gOLng,
          destinoLat: gDLat,
          destinoLng: gDLng,
          kilometros,
          completado: geoFlete.completado,
          geocodificar: true,
        }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, "No se pudo guardar la ubicación."));
      const data: { flete: Flete } = await res.json();
      const actualizado = data.flete;
      setFletes((prev) => prev.map((f) => (f.id === actualizado.id ? actualizado : f)));
      cerrarGeo();
      // Si ya tiene ambas ubicaciones y aún no está terminado, preguntar si marcarlo.
      const tieneAmbas =
        actualizado.origenLat != null &&
        actualizado.origenLng != null &&
        actualizado.destinoLat != null &&
        actualizado.destinoLng != null;
      if (tieneAmbas && !actualizado.completado) setConfirmarFlete(actualizado);
    } catch (err) {
      setErrorGeo(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setGuardandoGeo(false);
    }
  }

  async function marcarTerminado() {
    const f = confirmarFlete;
    if (!f) return;
    setGuardandoConfirmar(true);
    try {
      const res = await fetch(`/api/fletes/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documento,
          codigoVehiculo,
          fecha: f.fecha,
          origen: f.origen,
          destino: f.destino,
          descripcion: f.descripcion,
          kilos: f.kilos,
          origenLat: f.origenLat,
          origenLng: f.origenLng,
          destinoLat: f.destinoLat,
          destinoLng: f.destinoLng,
          kilometros: f.kilometros,
          completado: true,
        }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, "No se pudo marcar como terminado."));
      const data: { flete: Flete } = await res.json();
      setFletes((prev) => prev.map((x) => (x.id === data.flete.id ? data.flete : x)));
      setConfirmarFlete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setGuardandoConfirmar(false);
    }
  }

  async function enviarALiquidar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/fletes/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento, codigoVehiculo }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, "No se pudieron enviar los fletes."));
      const data: { fletes: Flete[] } = await res.json();
      if (data.fletes.length > 0) {
        generarPdfFletesDiarios(data.fletes, nombre, codigoVehiculo);
      }
      setBusqueda("");
      setMostrarEnvio(false);
      await cargarLista();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20";

  const estadoTexto = (f: Flete): string =>
    f.completado
      ? "completado"
      : f.origenLat != null && f.destinoLat == null
        ? "falta ubicación de destino"
        : f.origenLat == null && f.destinoLat != null
          ? "falta ubicación de origen"
          : f.origenLat == null && f.destinoLat == null
            ? "sin ubicación"
            : "pendiente por completar";

  const q = busqueda.trim().toLowerCase();
  const fletesFiltrados = q
    ? fletes.filter((f) =>
        [
          f.codigo,
          `flete #${f.numero}`,
          f.fecha,
          f.origen,
          f.destino,
          f.descripcion,
          `${f.kilos} kilos`,
          f.kilometros != null ? `${f.kilometros} km` : "",
          estadoTexto(f),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : fletes;

  const completados = fletes.filter((f) => f.completado);
  const incompletos = fletes.filter((f) => !f.completado);

  if (navegando) {
    return (
      <div className="mx-auto max-w-4xl">
        <NavegacionFlete
          documento={documento}
          codigoVehiculo={codigoVehiculo}
          flete={navegando}
          onSalir={() => {
            setNavegando(null);
            void cargarLista();
          }}
        />
      </div>
    );
  }

  if (detalle) {
    return (
      <div className="mx-auto max-w-4xl">
        <DetalleRecorrido documento={documento} flete={detalle} onSalir={() => setDetalle(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${tituloClaro ? "text-white" : "text-drivin-ink"}`}>
            Registrar flete · {nombre}
          </h2>
          <p className={`text-sm ${tituloClaro ? "text-white/70" : "text-drivin-muted"}`}>
            Registra los fletes que realizas.
          </p>
        </div>
        <button
          onClick={onVolver}
          className="rounded-lg border border-drivin-border bg-white px-4 py-2 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg"
        >
          Volver
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Formulario de registro */}
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta"
        >
          <h3 className="text-base font-bold text-drivin-ink">Nuevo flete</h3>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-drivin-ink">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputClass}
              />
            </div>

            <ConstructorRuta key={resetRuta} puntos={catalogo} onCambio={setParadasRuta} />

            <div>
              <label className="mb-1 block text-sm font-semibold text-drivin-ink">Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => {
                  const t = e.target.value;
                  // Solo la primera letra en mayúscula, el resto en minúscula.
                  setDescripcion(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
                }}
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-drivin-ink">Kilos enviados</label>
              <input
                value={kilos}
                onChange={(e) => setKilos(normalizarCantidad(e.target.value))}
                inputMode="decimal"
                placeholder="0"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-lg bg-drivin-indigo py-2.5 text-sm font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-60"
            >
              {guardando ? "Guardando…" : "Registrar flete"}
            </button>
          </div>
        </form>

        {/* Listado de fletes */}
        <div className="rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta">
          <h3 className="text-base font-bold text-drivin-ink">
            Fletes registrados{fletes.length > 0 ? ` (${fletes.length})` : ""}
          </h3>

          {fletes.length > 0 && (
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, origen, destino, fecha, estado…"
              className={`mt-3 ${inputClass}`}
            />
          )}

          {fletes.length > 0 && (
            <button
              type="button"
              onClick={() => setMostrarEnvio(true)}
              className="mt-3 w-full rounded-lg bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
            >
              Enviar fletes a liquidar{completados.length > 0 ? ` (${completados.length})` : ""}
            </button>
          )}

          {cargandoLista ? (
            <div className="mt-6 flex items-center gap-3 text-sm text-drivin-muted">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-drivin-border border-t-drivin-indigo" />
              Cargando…
            </div>
          ) : fletes.length === 0 ? (
            <p className="mt-4 rounded-md bg-drivin-bg px-3 py-3 text-sm text-drivin-muted">
              Aún no has registrado fletes.
            </p>
          ) : fletesFiltrados.length === 0 ? (
            <p className="mt-4 rounded-md bg-drivin-bg px-3 py-3 text-sm text-drivin-muted">
              Sin resultados para “{busqueda}”.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {fletesFiltrados.map((f) => (
                <li key={f.id} className="rounded-lg border border-drivin-border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="rounded bg-drivin-indigo/10 px-2 py-0.5 text-xs font-bold text-drivin-indigo">
                      {f.codigo}
                    </span>
                    <span className="text-xs font-semibold text-drivin-muted">Flete #{f.numero}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-drivin-ink">
                      {f.origen} → {f.destino}
                    </span>
                    <span className="text-xs font-semibold text-drivin-muted">{f.fecha}</span>
                  </div>
                  <p className="mt-1 text-sm text-drivin-muted">{f.descripcion}</p>
                  <p className="mt-1 text-xs font-semibold text-drivin-indigo">
                    {numero(f.kilos, f.kilos % 1 === 0 ? 0 : 2)} kilos
                    {f.kilometros != null && (
                      <span className="ml-2">· {numero(f.kilometros, 2)} km recorridos</span>
                    )}
                  </p>
                  <div className="mt-1 flex justify-end">
                    {f.completado ? (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Completado
                      </span>
                    ) : f.origenLat != null && f.destinoLat == null ? (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Falta ubicación de destino
                      </span>
                    ) : f.origenLat == null && f.destinoLat != null ? (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Falta ubicación de origen
                      </span>
                    ) : f.origenLat == null && f.destinoLat == null ? (
                      <span className="inline-block rounded-full bg-drivin-bg px-2 py-0.5 text-xs font-semibold text-drivin-muted">
                        Sin ubicación
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-drivin-bg px-2 py-0.5 text-xs font-semibold text-drivin-muted">
                        Pendiente por completar
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {f.paradasCount != null && f.paradasCount >= 2 && f.estadoViaje !== "finalizado" && (
                      <button
                        type="button"
                        onClick={() => setNavegando(f)}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        {f.estadoViaje === "en_curso" ? "🧭 Continuar" : "▶ Iniciar flete"}
                      </button>
                    )}
                    {f.estadoViaje === "finalizado" && (
                      <button
                        type="button"
                        onClick={() => setDetalle(f)}
                        className="text-xs font-bold text-drivin-indigo hover:underline"
                      >
                        📊 Ver detalle
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => abrirEdicion(f)}
                      className="text-xs font-semibold text-drivin-indigo hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirGeo(f)}
                      className="text-xs font-semibold text-drivin-indigo hover:underline"
                    >
                      {f.kilometros != null ? "Ubicación ✓" : "Ubicación"}
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(f.id)}
                      disabled={eliminandoId === f.id}
                      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                    >
                      {eliminandoId === f.id ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal de edición */}
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={cerrarEdicion}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-drivin-ink">Editar flete</h3>
              <button
                type="button"
                onClick={cerrarEdicion}
                aria-label="Cerrar"
                className="rounded-md px-2 text-lg font-bold text-drivin-muted transition hover:text-drivin-ink"
              >
                ×
              </button>
            </div>

            <form onSubmit={onSubmitEdicion} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-drivin-ink">Fecha</label>
                <input
                  type="date"
                  value={eFecha}
                  onChange={(e) => setEFecha(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-drivin-ink">Origen</label>
                  <SelectorBuscable
                    value={eOrigen}
                    onChange={setEOrigen}
                    opciones={[...PUNTOS, ...puntosOrigen, ...ubicacionesPersonalizadas]}
                    placeholder="Selecciona o escribe…"
                    onCrear={crearUbicacion}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-drivin-ink">Destino</label>
                  <SelectorBuscable
                    value={eDestino}
                    onChange={setEDestino}
                    opciones={[...PUNTOS, ...puntosDestino, ...ubicacionesPersonalizadas]}
                    placeholder="Selecciona o escribe…"
                    onCrear={crearUbicacion}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-drivin-ink">Descripción</label>
                <textarea
                  value={eDescripcion}
                  onChange={(e) => {
                    const t = e.target.value;
                    setEDescripcion(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
                  }}
                  rows={3}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-drivin-ink">Kilos enviados</label>
                <input
                  value={eKilos}
                  onChange={(e) => setEKilos(normalizarCantidad(e.target.value))}
                  inputMode="decimal"
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              {errorEdicion && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {errorEdicion}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="flex-1 rounded-lg bg-drivin-indigo py-2.5 text-sm font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-60"
                >
                  {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={cerrarEdicion}
                  className="rounded-lg border border-drivin-border bg-white px-4 py-2.5 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de geolocalización */}
      {geoFlete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={cerrarGeo}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-drivin-ink">Ubicación del flete</h3>
              <button
                type="button"
                onClick={cerrarGeo}
                aria-label="Cerrar"
                className="rounded-md px-2 text-lg font-bold text-drivin-muted transition hover:text-drivin-ink"
              >
                ×
              </button>
            </div>

            <p className="mb-3 text-sm text-drivin-muted">
              {geoFlete.origen} → {geoFlete.destino}
            </p>

            <CapturaUbicaciones
              oLat={gOLat}
              oLng={gOLng}
              dLat={gDLat}
              dLng={gDLng}
              onOrigen={(lat, lng) => {
                setGOLat(lat);
                setGOLng(lng);
              }}
              onDestino={(lat, lng) => {
                setGDLat(lat);
                setGDLng(lng);
              }}
            />

            {gOLat != null && gDLat == null && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                Falta ubicación de destino.
              </p>
            )}

            {errorGeo && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {errorGeo}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={guardarGeo}
                disabled={guardandoGeo}
                className="flex-1 rounded-lg bg-drivin-indigo py-2.5 text-sm font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-60"
              >
                {guardandoGeo ? "Guardando…" : "Guardar ubicación"}
              </button>
              <button
                type="button"
                onClick={cerrarGeo}
                className="rounded-lg border border-drivin-border bg-white px-4 py-2.5 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación: marcar como terminado */}
      {confirmarFlete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() => setConfirmarFlete(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-drivin-ink">¿Marcar como terminado?</h3>
            <p className="mt-1 text-sm text-drivin-muted">
              Ya registraste el origen y el destino de este flete
              {confirmarFlete.kilometros != null
                ? ` (${numero(confirmarFlete.kilometros, 2)} km).`
                : "."}{" "}
              ¿Deseas marcarlo como completado?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={marcarTerminado}
                disabled={guardandoConfirmar}
                className="flex-1 rounded-lg bg-drivin-indigo py-2.5 text-sm font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-60"
              >
                {guardandoConfirmar ? "Guardando…" : "Sí, marcar completado"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmarFlete(null)}
                className="rounded-lg border border-drivin-border bg-white px-4 py-2.5 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de envío a liquidación */}
      {mostrarEnvio && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() => !enviando && setMostrarEnvio(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-drivin-ink">Enviar fletes a liquidar</h3>

            {completados.length === 0 ? (
              <>
                <p className="mt-2 text-sm text-drivin-muted">
                  No tienes fletes completados. Completa la ubicación de origen y destino para
                  poder enviarlos a liquidación.
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMostrarEnvio(false)}
                    className="rounded-lg border border-drivin-border bg-white px-4 py-2.5 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-drivin-muted">
                  Se enviarán <strong>{completados.length}</strong> flete(s) completado(s) a
                  liquidación y se descargará el PDF del día.
                </p>
                {incompletos.length > 0 && (
                  <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    Tienes {incompletos.length} flete(s) sin completar que NO se tendrán en cuenta
                    en la liquidación si no los completas.
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={enviarALiquidar}
                    disabled={enviando}
                    className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    {enviando ? "Enviando…" : "Enviar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarEnvio(false)}
                    disabled={enviando}
                    className="rounded-lg border border-drivin-border bg-white px-4 py-2.5 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
