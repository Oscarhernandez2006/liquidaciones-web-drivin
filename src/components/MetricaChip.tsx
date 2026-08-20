/** Pequeña tarjeta de métrica (Pedidos, Kilómetros, etc.). */
export default function MetricaChip({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string | number;
}) {
  return (
    <div className="rounded-lg border border-drivin-border bg-white px-4 py-3 text-center shadow-tarjeta print:px-1 print:py-2 print:shadow-none">
      <div className="text-lg font-bold text-drivin-ink print:text-base">{valor}</div>
      <div className="mt-0.5 text-xs font-medium text-drivin-muted print:text-[10px]">{etiqueta}</div>
    </div>
  );
}
