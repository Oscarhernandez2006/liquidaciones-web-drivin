import Link from "next/link";
import type { LiquidacionResumen } from "@/lib/tipos";
import { moneda } from "@/lib/formato";

/** Tarjeta de un período liquidado (tarjeta blanca con acentos azules, igual que el aplicativo).
 *  Si se pasa onSelect actúa como botón (abre modal); si no, navega al detalle. */
export default function TarjetaPeriodo({
  liquidacion,
  documento,
  onSelect,
}: {
  liquidacion: LiquidacionResumen;
  documento?: string;
  onSelect?: (id: string) => void;
}) {
  const contenido = (
    <>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-drivin-marca50 text-drivin-indigo"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 17.5v-11" />
          </svg>
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-drivin-muted">
          Liquidación del período
        </span>
      </div>

      <div className="mt-4 text-base font-bold leading-snug text-drivin-ink">{liquidacion.periodoEtiqueta}</div>

      <span className="mt-2 w-fit whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        {liquidacion.rangoFechas}
      </span>

      <div className="mt-4 border-t border-drivin-border pt-4">
        <div className="text-xs font-medium text-drivin-muted">Total liquidado</div>
        <div className="mt-0.5 text-2xl font-bold text-drivin-indigo">{moneda(liquidacion.total)}</div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            liquidacion.cumple ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {liquidacion.estadoCumple}
        </span>
        <span className="whitespace-nowrap text-sm font-semibold text-drivin-indigo transition group-hover:translate-x-0.5">
          Ver detalle →
        </span>
      </div>
    </>
  );

  const clases =
    "group flex flex-col rounded-2xl border border-drivin-border bg-white p-5 text-left shadow-tarjeta transition hover:-translate-y-0.5 hover:border-drivin-marca200 hover:shadow-md";

  // Modo modal: botón que dispara onSelect.
  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(liquidacion.id)} className={clases}>
        {contenido}
      </button>
    );
  }

  // Modo navegación: enlace al detalle. En modo maestro se pasa el documento por query.
  const href = documento
    ? `/liquidacion/${liquidacion.id}?documento=${encodeURIComponent(documento)}`
    : `/liquidacion/${liquidacion.id}`;

  return (
    <Link href={href} className={clases}>
      {contenido}
    </Link>
  );
}
