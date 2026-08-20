/** Overlay tipo modal con spinner animado (para estados de carga). */
export default function OverlayCargando({ mensaje = "Cargando…" }: { mensaje?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-12 py-9 shadow-2xl">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-drivin-border border-t-drivin-indigo" />
        <p className="text-sm font-semibold text-drivin-ink">{mensaje}</p>
      </div>
    </div>
  );
}
