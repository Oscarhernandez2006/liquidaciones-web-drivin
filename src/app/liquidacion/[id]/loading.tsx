import OverlayCargando from "@/components/OverlayCargando";

// Next.js muestra esto automáticamente mientras carga la ruta del detalle.
export default function Loading() {
  return <OverlayCargando mensaje="Cargando tu liquidación…" />;
}
