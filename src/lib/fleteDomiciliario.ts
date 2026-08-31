// Domiciliario habilitado para el módulo "Registrar flete".
// Solo este documento ve el menú con la opción de registrar fletes.
export const DOMICILIARIO_FLETE = {
  documento: "1081026787",
  codigoVehiculo: "LZR889",
  nombre: "Marlon",
} as const;

/** true si el documento corresponde al domiciliario habilitado para fletes. */
export function esDomiciliarioFlete(documento: string): boolean {
  return documento.trim() === DOMICILIARIO_FLETE.documento;
}
