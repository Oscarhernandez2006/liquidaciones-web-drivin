import Link from "next/link";
import type { LiquidacionResumen } from "@/lib/tipos";
import { moneda } from "@/lib/formato";

/** Tarjeta de un período liquidado (gradiente índigo, igual que el aplicativo). */
export default function TarjetaPeriodo({ liquidacion }: { liquidacion: LiquidacionResumen }) {
  return (
    <Link
      href={`/liquidacion/${liquidacion.id}`}
      className="group flex flex-col rounded-xl bg-gradient-to-br from-drivin-indigo to-drivin-indigoDark p-5 text-white shadow-tarjeta transition hover:brightness-110"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-lg">
          🧾
        </span>
        <span className="text-sm font-bold">Liquidación del período</span>
      </div>

      <div className="mt-3 text-lg font-bold leading-snug text-indigo-50">
        {liquidacion.periodoEtiqueta}
      </div>

      <span className="mt-2 w-fit rounded bg-white/15 px-2 py-0.5 text-xs font-semibold text-indigo-50">
        {liquidacion.rangoFechas}
      </span>

      <div className="mt-4 border-t border-white/15 pt-3">
        <div className="text-xs font-medium text-indigo-100/80">Total liquidado</div>
        <div className="text-2xl font-extrabold">{moneda(liquidacion.total)}</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={`rounded px-2 py-0.5 text-xs font-bold ${
            liquidacion.cumple ? "bg-emerald-400/20 text-emerald-50" : "bg-red-400/20 text-red-50"
          }`}
        >
          {liquidacion.estadoCumple}
        </span>
        <span className="text-sm font-semibold text-indigo-100 transition group-hover:translate-x-0.5">
          Ver detalle →
        </span>
      </div>
    </Link>
  );
}
