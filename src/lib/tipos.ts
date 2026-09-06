// Tipos que reflejan los DTOs del aplicativo (LiquidacionFilaDto, LiquidacionPdvDto).

/** Fila de liquidación de un domiciliario. Los conceptos en null se muestran como "No aplica". */
export interface LiquidacionFila {
  domiciliario: string;
  pedidos: number;
  runErrands: number;
  fueraRango: number;
  noConfirmados: number;
  kilometros: number;
  gasolina: number | null;
  rodamiento: number | null;
  usoCelular: number | null;
  runErrandsMonto: number | null;
  variablePedido: number | null;
  variableKm: number | null;
  total: number;
}

/** Datos identificatorios del domiciliario. */
export interface DomiciliarioInfo {
  documento: string;
  codigoVehiculo: string;
  nombre: string;
  pdv: string;
}

/** Resumen de una liquidación publicada (para la lista de tarjetas). */
export interface LiquidacionResumen {
  id: string;
  periodoEtiqueta: string;
  rangoFechas: string;
  cumple: boolean;
  estadoCumple: string;
  total: number;
}

/** Detalle completo de una liquidación (para la vista de recibo). */
export interface LiquidacionDetalle extends LiquidacionResumen {
  domiciliario: DomiciliarioInfo;
  fila: LiquidacionFila;
}

/** Resultado de la consulta por documento + código de vehículo. */
export interface ConsultaResultado {
  domiciliario: DomiciliarioInfo;
  liquidaciones: LiquidacionResumen[];
}

/** Un pedido confirmado fuera de rango. */
export interface FueraRangoFila {
  fecha: string; // dd/MM/yyyy
  nombreCliente: string;
  distanciaConfirmada: string; // ej. "450 Mts" o "No Confirmado"
}

/** Período publicado con los pedidos fuera de rango de un domiciliario. */
export interface FueraRangoPeriodo {
  id: string;
  periodoEtiqueta: string;
  rangoFechas: string;
  total: number; // cantidad de pedidos fuera de rango
  filas: FueraRangoFila[];
}

/** Resultado de la consulta de pedidos fuera de rango. */
export interface FueraRangoResultado {
  periodos: FueraRangoPeriodo[];
}

/** Flete registrado por un domiciliario. */
export interface Flete {
  id: string;
  consecutivo: number; // trazabilidad global
  codigo: string; // FLE-000001
  numero: number; // número de flete del domiciliario
  fecha: string; // YYYY-MM-DD
  origen: string;
  destino: string;
  descripcion: string;
  kilos: number;
  origenLat: number | null;
  origenLng: number | null;
  destinoLat: number | null;
  destinoLng: number | null;
  kilometros: number | null;
  origenDireccion: string | null;
  origenBarrio: string | null;
  origenCiudad: string | null;
  origenEstablecimiento: string | null;
  destinoDireccion: string | null;
  destinoBarrio: string | null;
  destinoCiudad: string | null;
  destinoEstablecimiento: string | null;
  rutaGeometria: string | null;
  estadoViaje: "planeado" | "en_curso" | "finalizado";
  paradasCount: number | null;
  completado: boolean;
  creadoEn: string;
}

/** Datos para registrar un nuevo flete. */
export interface FleteEntrada {
  fecha: string; // YYYY-MM-DD
  origen: string;
  destino: string;
  descripcion: string;
  kilos: number;
  origenLat: number | null;
  origenLng: number | null;
  destinoLat: number | null;
  destinoLng: number | null;
  kilometros: number | null;
  origenDireccion?: string | null;
  origenBarrio?: string | null;
  origenCiudad?: string | null;
  origenEstablecimiento?: string | null;
  destinoDireccion?: string | null;
  destinoBarrio?: string | null;
  destinoCiudad?: string | null;
  destinoEstablecimiento?: string | null;
  rutaGeometria?: string | null;
  completado: boolean;
}
