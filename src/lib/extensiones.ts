export type EstadoExtension = "pendiente" | "aprobada" | "rechazada" | "cancelada" | "vencida" | "cerrada";

/** Extensión de horario solicitada por Despacho para el domiciliario (SIGCOMPRO). */
export interface SolicitudExtension {
  id: string;
  dia: string;
  punto_venta: string | null;
  motivo: string;
  estado: EstadoExtension;
  solicitado_por: string | null;
  solicitado_en: string;
  resuelto_por: string | null;
  resuelto_en: string | null;
  motivo_rechazo: string | null;
  cerrado_en: string | null;
  valor: number;
  pedidos: number;
}
