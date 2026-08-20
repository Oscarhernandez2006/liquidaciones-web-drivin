// Formateadores de moneda y números (locale Colombia).

const monedaFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Formatea un monto en pesos. `null`/`undefined` => "No aplica". */
export function moneda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "No aplica";
  return monedaFmt.format(valor);
}

/** true cuando el concepto no aplica al domiciliario. */
export function noAplica(valor: number | null | undefined): boolean {
  return valor === null || valor === undefined;
}

/** Formatea un número con separador de miles y decimales opcionales. */
export function numero(valor: number, decimales = 0): string {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}
