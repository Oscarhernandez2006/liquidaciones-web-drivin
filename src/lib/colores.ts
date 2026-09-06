// Colores de las paradas del flete en el mapa y las líneas de tiempo.
// Origen verde, destino rojo, y cada parada intermedia con un color distinto.

export const COLOR_ORIGEN = "#16A34A";
export const COLOR_DESTINO = "#DC2626";

/** Paleta para las paradas intermedias (se recorre en orden). */
export const PALETA_PARADAS = [
  "#6366F1", // índigo
  "#F59E0B", // ámbar
  "#0EA5E9", // azul cielo
  "#EC4899", // rosa
  "#8B5CF6", // violeta
  "#14B8A6", // teal
  "#F97316", // naranja
  "#84CC16", // lima
];

/** Color de la parada intermedia número n (0-based). */
export function colorIntermedio(n: number): string {
  const i = ((n % PALETA_PARADAS.length) + PALETA_PARADAS.length) % PALETA_PARADAS.length;
  return PALETA_PARADAS[i];
}

/** Color por posición en la ruta: origen, destino (último si hay más de uno) o intermedio. */
export function colorParada(indice: number, total: number): string {
  if (indice === 0) return COLOR_ORIGEN;
  if (indice === total - 1 && total > 1) return COLOR_DESTINO;
  return colorIntermedio(indice - 1);
}
