"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (valor: string) => void;
  opciones: readonly string[];
  placeholder?: string;
  onCrear?: (valor: string) => void; // Callback para crear nueva opción
}

/** Input con desplegable filtrable: se escribe para buscar y se selecciona una opción.
 *  Si onCrear es provisto y no hay coincidencias, muestra botón para crear. */
export default function SelectorBuscable({ value, onChange, opciones, placeholder, onCrear }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alClicFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setFiltro("");
      }
    }
    document.addEventListener("mousedown", alClicFuera);
    return () => document.removeEventListener("mousedown", alClicFuera);
  }, []);

  const texto = abierto ? filtro : value;
  const normal = (s: string) => s.toLowerCase().trim();
  const filtradas = filtro.trim()
    ? opciones.filter((o) => normal(o).includes(normal(filtro)))
    : opciones;

  const hayCoincidencias = filtradas.length > 0;
  const filtroTrimmed = filtro.trim();
  const puedeCrear = onCrear && abierto && filtroTrimmed && !hayCoincidencias;

  function seleccionar(opcion: string) {
    onChange(opcion);
    setAbierto(false);
    setFiltro("");
  }

  function crearNueva() {
    if (onCrear && filtroTrimmed) {
      onCrear(filtroTrimmed);
      setFiltro("");
      setAbierto(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-drivin-border px-3 py-2.5 text-sm outline-none transition focus:border-drivin-indigo focus:ring-2 focus:ring-drivin-indigo/20";

  return (
    <div ref={contenedorRef} className="relative">
      <input
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          setFiltro(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => {
          setAbierto(true);
          setFiltro("");
        }}
        className={inputClass}
        autoComplete="off"
      />
      {abierto && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-drivin-border bg-white py-1 shadow-tarjeta">
          {hayCoincidencias ? (
            <>
              {filtradas.map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    onClick={() => seleccionar(o)}
                    className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-drivin-bg ${
                      o === value ? "font-semibold text-drivin-indigo" : "text-drivin-ink"
                    }`}
                  >
                    {o}
                  </button>
                </li>
              ))}
            </>
          ) : puedeCrear ? (
            <li>
              <button
                type="button"
                onClick={crearNueva}
                className="block w-full px-3 py-2 text-left text-sm font-semibold text-green-600 transition hover:bg-green-50"
              >
                + Crear "{filtroTrimmed}"
              </button>
            </li>
          ) : (
            <li className="px-3 py-2 text-sm text-drivin-muted">Sin coincidencias</li>
          )}
        </ul>
      )}
    </div>
  );
}
