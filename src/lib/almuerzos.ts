export type EstadoAlmuerzo =
  | "pendiente"
  | "aprobada"
  | "reprogramada"
  | "rechazada"
  | "cancelada"
  | "vencida"
  | "terminada";

export interface SolicitudAlmuerzo {
  id: string;
  punto_id: string;
  punto_nombre: string | null;
  dia: string;
  hora_solicitada: string;
  inicio: string;
  fin: string;
  estado: EstadoAlmuerzo;
  nota: string | null;
  solicitado_en: string;
  resuelto_por_nombre: string | null;
  resuelto_en: string | null;
  motivo_rechazo: string | null;
  terminado_en: string | null;
}

export interface PuntosAlmuerzo {
  nombre: string | null;
  puntos: { id: string; nombre: string }[];
}
