// Sesión ligera del portal: guarda documento + código con expiración por inactividad.
// No es un login con contraseña; solo evita volver a escribir los datos mientras la sesión sigue vigente.

const TTL_MS = 30 * 60 * 1000; // 30 minutos de inactividad
const K_DOC = "vld_doc";
const K_COD = "vld_cod";
const K_EXP = "vld_exp";

export interface Sesion {
  documento: string;
  codigoVehiculo: string;
}

export function guardarSesion(documento: string, codigoVehiculo: string): void {
  try {
    localStorage.setItem(K_DOC, documento);
    localStorage.setItem(K_COD, codigoVehiculo);
    localStorage.setItem(K_EXP, String(Date.now() + TTL_MS));
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Devuelve la sesión si sigue vigente (y renueva su expiración), o null si expiró/no existe. */
export function obtenerSesion(): Sesion | null {
  try {
    const documento = localStorage.getItem(K_DOC);
    const codigoVehiculo = localStorage.getItem(K_COD);
    const exp = Number(localStorage.getItem(K_EXP) ?? 0);

    if (!documento || !codigoVehiculo) return null;
    if (!exp || Date.now() > exp) {
      limpiarSesion();
      return null;
    }
    // Expiración deslizante: cada uso extiende la vigencia.
    localStorage.setItem(K_EXP, String(Date.now() + TTL_MS));
    return { documento, codigoVehiculo };
  } catch {
    return null;
  }
}

export function limpiarSesion(): void {
  try {
    localStorage.removeItem(K_DOC);
    localStorage.removeItem(K_COD);
    localStorage.removeItem(K_EXP);
  } catch {
    /* almacenamiento no disponible */
  }
}
