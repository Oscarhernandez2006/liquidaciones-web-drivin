/** Distintivo de estado del período (verde = cumple, rojo = no cumple). */
export default function Badge({ cumple, texto }: { cumple: boolean; texto: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-bold ${
        cumple ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]"
      }`}
    >
      {texto}
    </span>
  );
}
