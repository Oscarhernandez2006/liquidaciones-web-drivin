"use client";

/** Botón para imprimir/guardar como PDF el recibo (usa el diálogo del navegador). */
export default function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-drivin-indigoDark shadow-sm transition hover:bg-drivin-marca50"
    >
      <span aria-hidden>🖨️</span>
      Descargar / Imprimir
    </button>
  );
}
