"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ConsultaResultado } from "@/lib/tipos";
import type { DomiciliarioPublicado } from "@/lib/maestro";
import TarjetaPeriodo from "./TarjetaPeriodo";
import ModuloFletes from "./ModuloFletes";
import { DOMICILIARIO_FLETE } from "@/lib/fleteDomiciliario";
import {
  guardarSesionMaestra,
  obtenerSesionMaestra,
  limpiarSesionMaestra,
} from "@/lib/maestroSesion";

type Vista = "cargando" | "login" | "portal";

export default function MaestroPortal() {
  const [vista, setVista] = useState<Vista>("cargando");
  const [token, setToken] = useState("");
  const [nombreMaestro, setNombreMaestro] = useState("");

  // Login
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const [autenticando, setAutenticando] = useState(false);

  // Portal
  const [domiciliarios, setDomiciliarios] = useState<DomiciliarioPublicado[]>([]);
  const [filtro, setFiltro] = useState("");
  const [seleccionado, setSeleccionado] = useState<DomiciliarioPublicado | null>(null);
  const [listaAbierta, setListaAbierta] = useState(true);
  const [vistaFletes, setVistaFletes] = useState(false);
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);
  const [cargandoLiq, setCargandoLiq] = useState(false);
  const [errorPortal, setErrorPortal] = useState<string | null>(null);

  const salir = useCallback(() => {
    limpiarSesionMaestra();
    setToken("");
    setNombreMaestro("");
    setDomiciliarios([]);
    setSeleccionado(null);
    setListaAbierta(true);
    setResultado(null);
    setVista("login");
  }, []);

  const cargarDomiciliarios = useCallback(
    async (tk: string) => {
      setErrorPortal(null);
      try {
        const res = await fetch("/api/maestro/domiciliarios", {
          headers: { "x-maestro-token": tk },
        });
        if (res.status === 401) {
          salir();
          return;
        }
        if (!res.ok) throw new Error("No se pudo cargar la lista de domiciliarios.");
        const data = await res.json();
        setDomiciliarios(data.domiciliarios ?? []);
      } catch (err) {
        setErrorPortal(err instanceof Error ? err.message : "Error inesperado.");
      }
    },
    [salir]
  );

  // Al montar: si hay sesión maestra vigente, entra directo al portal.
  useEffect(() => {
    const s = obtenerSesionMaestra();
    if (s) {
      setToken(s.token);
      setNombreMaestro(s.nombre);
      setVista("portal");
      void cargarDomiciliarios(s.token);
    } else {
      setVista("login");
    }
  }, [cargarDomiciliarios]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !contrasena) {
      setErrorLogin("Ingresa tu usuario (cédula) y tu contraseña.");
      return;
    }
    setErrorLogin(null);
    setAutenticando(true);
    try {
      const res = await fetch("/api/maestro/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario.trim(), contrasena }),
      });
      if (res.status === 401) {
        setErrorLogin("Usuario o contraseña incorrectos.");
        return;
      }
      if (!res.ok) throw new Error("No se pudo iniciar sesión. Intenta de nuevo.");
      const data = await res.json();
      guardarSesionMaestra(data.token, data.nombre);
      setToken(data.token);
      setNombreMaestro(data.nombre);
      setContrasena("");
      setVista("portal");
      void cargarDomiciliarios(data.token);
    } catch (err) {
      setErrorLogin(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setAutenticando(false);
    }
  }

  async function seleccionar(dom: DomiciliarioPublicado) {
    setSeleccionado(dom);
    setListaAbierta(false);
    setFiltro("");
    setResultado(null);
    setErrorPortal(null);
    setCargandoLiq(true);
    try {
      const res = await fetch("/api/maestro/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-maestro-token": token },
        body: JSON.stringify({ documento: dom.documento }),
      });
      if (res.status === 401) {
        salir();
        return;
      }
      if (res.status === 404) {
        setResultado(null);
        return;
      }
      if (!res.ok) throw new Error("No se pudieron cargar las liquidaciones.");
      setResultado((await res.json()) as ConsultaResultado);
    } catch (err) {
      setErrorPortal(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCargandoLiq(false);
    }
  }

  const domiciliariosFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return domiciliarios;
    return domiciliarios.filter(
      (d) =>
        d.nombre.toLowerCase().includes(q) ||
        d.documento.toLowerCase().includes(q) ||
        d.codigoVehiculo.toLowerCase().includes(q)
    );
  }, [domiciliarios, filtro]);

  if (vista === "cargando") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-drivin-border bg-white p-10 shadow-tarjeta">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-drivin-border border-t-drivin-indigo" />
        <p className="text-sm font-medium text-drivin-muted">Cargando…</p>
      </div>
    );
  }

  if (vista === "login") {
    return (
      <form
        onSubmit={onLogin}
        className="mx-auto max-w-md rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta"
      >
        <h2 className="text-xl font-bold text-drivin-ink">Ingreso de usuario maestro</h2>
        <p className="mt-1 text-sm text-drivin-muted">
          Usa tu usuario (cédula) y contraseña del aplicativo.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-drivin-ink">Usuario (cédula)</label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              inputMode="numeric"
              autoComplete="username"
              className="w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-drivin-ink">Contraseña</label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20"
            />
          </div>

          {errorLogin && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{errorLogin}</p>
          )}

          <button
            type="submit"
            disabled={autenticando}
            className="w-full rounded-lg bg-drivin-indigo py-2.5 text-sm font-bold text-white transition hover:bg-drivin-indigoDark disabled:opacity-60"
          >
            {autenticando ? "Ingresando…" : "Ingresar"}
          </button>

          <Link
            href="/"
            className="block text-center text-sm font-semibold text-drivin-muted hover:text-drivin-ink"
          >
            ← Soy domiciliario
          </Link>
        </div>
      </form>
    );
  }

  // vista === "portal"
  if (vistaFletes) {
    return (
      <ModuloFletes
        documento={DOMICILIARIO_FLETE.documento}
        codigoVehiculo={DOMICILIARIO_FLETE.codigoVehiculo}
        nombre={DOMICILIARIO_FLETE.nombre}
        onVolver={() => setVistaFletes(false)}
        tituloClaro={false}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-drivin-ink">
            Modo maestro{nombreMaestro ? ` · ${nombreMaestro}` : ""}
          </h2>
          <p className="text-sm text-drivin-muted">
            Selecciona un domiciliario para ver sus liquidaciones publicadas.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVistaFletes(true)}
            className="rounded-lg bg-drivin-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-drivin-indigoDark"
          >
            Registrar fletes
          </button>
          <button
            onClick={salir}
            className="rounded-lg border border-drivin-border bg-white px-4 py-2 text-sm font-semibold text-drivin-muted transition hover:bg-drivin-bg"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Selector de domiciliarios */}
        <aside className="rounded-xl border border-drivin-border bg-white p-4 shadow-tarjeta">
          {seleccionado && !listaAbierta ? (
            <>
              <button
                onClick={() => setListaAbierta(true)}
                className="flex w-full items-center justify-between rounded-lg bg-drivin-indigo px-3 py-2 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">
                    {seleccionado.nombre}
                  </span>
                  <span className="block text-xs text-indigo-100">
                    Doc {seleccionado.documento} · {seleccionado.codigoVehiculo} · {seleccionado.cantidad} liq.
                  </span>
                </span>
                <span aria-hidden className="ml-2 shrink-0 text-indigo-100">▾</span>
              </button>
              <p className="mt-2 text-center text-xs text-drivin-muted">
                Toca de nuevo para elegir otro domiciliario
              </p>
            </>
          ) : (
            <>
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por nombre, documento o código…"
                className="mb-3 w-full rounded-lg border border-drivin-border px-3 py-2 text-sm outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20"
              />

              {domiciliariosFiltrados.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-drivin-muted">
                  {domiciliarios.length === 0
                    ? "No hay domiciliarios publicados."
                    : "Sin coincidencias."}
                </p>
              ) : (
                <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
                  {domiciliariosFiltrados.map((d) => {
                    const activo = seleccionado?.documento === d.documento && seleccionado?.codigoVehiculo === d.codigoVehiculo;
                    return (
                      <li key={`${d.documento}-${d.codigoVehiculo}`}>
                        <button
                          onClick={() => seleccionar(d)}
                          className={`w-full rounded-lg px-3 py-2 text-left transition ${
                            activo ? "bg-drivin-indigo text-white" : "hover:bg-drivin-bg"
                          }`}
                        >
                          <span className={`block text-sm font-semibold ${activo ? "text-white" : "text-drivin-ink"}`}>
                            {d.nombre}
                          </span>
                          <span className={`block text-xs ${activo ? "text-indigo-100" : "text-drivin-muted"}`}>
                            Doc {d.documento} · {d.codigoVehiculo} · {d.cantidad} liq.
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </aside>

        {/* Liquidaciones del domiciliario elegido */}
        <section>
          {errorPortal && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{errorPortal}</p>
          )}

          {!seleccionado && (
            <div className="rounded-xl border border-dashed border-drivin-border bg-white/60 p-10 text-center">
              <p className="text-sm text-drivin-muted">Elige un domiciliario de la lista.</p>
            </div>
          )}

          {seleccionado && cargandoLiq && (
            <div className="flex items-center gap-3 rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-drivin-border border-t-drivin-indigo" />
              <p className="text-sm font-medium text-drivin-muted">Cargando liquidaciones…</p>
            </div>
          )}

          {seleccionado && !cargandoLiq && resultado && resultado.liquidaciones.length > 0 && (
            <>
              <div className="mb-4">
                <h3 className="text-base font-bold text-drivin-ink">{resultado.domiciliario.nombre}</h3>
                <p className="text-sm text-drivin-muted">
                  {resultado.liquidaciones.length} liquidación(es) · Doc {resultado.domiciliario.documento} ·{" "}
                  {resultado.domiciliario.codigoVehiculo}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {resultado.liquidaciones.map((l) => (
                  <TarjetaPeriodo
                    key={l.id}
                    liquidacion={l}
                    documento={resultado.domiciliario.documento}
                  />
                ))}
              </div>
            </>
          )}

          {seleccionado && !cargandoLiq && (!resultado || resultado.liquidaciones.length === 0) && (
            <div className="rounded-xl border border-drivin-border bg-white p-8 text-center shadow-tarjeta">
              <p className="text-sm font-medium text-amber-800">
                Este domiciliario no tiene liquidaciones publicadas.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
