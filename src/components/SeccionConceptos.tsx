import { moneda, noAplica } from "@/lib/formato";

type Tono = "fijos" | "run" | "varsec";

// Clases estáticas por tono (para que Tailwind las detecte en build).
const TONOS: Record<Tono, { header: string; cell: string }> = {
  fijos: { header: "bg-fijos-hdr text-fijos-txt", cell: "bg-fijos-cell" },
  run: { header: "bg-run-hdr text-run-txt", cell: "bg-run-cell" },
  varsec: { header: "bg-varsec-hdr text-varsec-txt", cell: "bg-varsec-cell" },
};

export interface Concepto {
  label: string;
  valor: number | null;
}

/** Bloque de una sección de conceptos con encabezado coloreado (patrón del Resumen). */
export default function SeccionConceptos({
  titulo,
  tono,
  conceptos,
}: {
  titulo: string;
  tono: Tono;
  conceptos: Concepto[];
}) {
  const clases = TONOS[tono];
  return (
    <div className="overflow-hidden rounded-lg border border-drivin-border shadow-tarjeta">
      <div className={`px-4 py-2.5 text-sm font-bold ${clases.header}`}>{titulo}</div>
      <ul>
        {conceptos.map((c) => (
          <li
            key={c.label}
            className={`flex items-center justify-between border-t border-drivin-border px-4 py-3 ${clases.cell}`}
          >
            <span className="text-sm font-medium text-drivin-ink">{c.label}</span>
            <span
              className={`text-sm font-semibold ${
                noAplica(c.valor) ? "italic text-drivin-muted" : "text-drivin-ink"
              }`}
            >
              {moneda(c.valor)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
