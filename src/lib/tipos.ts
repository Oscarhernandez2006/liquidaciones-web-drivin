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
