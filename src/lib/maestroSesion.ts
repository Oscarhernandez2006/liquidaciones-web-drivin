// Sesión maestra del portal (client-side): guarda el token firmado y el nombre del usuario.
const TTL_MS = 8 * 60 * 60 * 1000; // 8 horas (coincide con el token del servidor)
const K_TOKEN = "vld_maestro_token";
const K_NOMBRE = "vld_maestro_nombre";
const K_EXP = "vld_maestro_exp";

export interface SesionMaestra {
  token: string;
  nombre: string;
}

export function guardarSesionMaestra(token: string, nombre: string): void {
  try {
    localStorage.setItem(K_TOKEN, token);
    localStorage.setItem(K_NOMBRE, nombre);
    localStorage.setItem(K_EXP, String(Date.now() + TTL_MS));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function obtenerSesionMaestra(): SesionMaestra | null {
  try {
    const token = localStorage.getItem(K_TOKEN);
    const nombre = localStorage.getItem(K_NOMBRE) ?? "";
    const exp = Number(localStorage.getItem(K_EXP) ?? 0);
    if (!token) return null;
    if (!exp || Date.now() > exp) {
      limpiarSesionMaestra();
      return null;
    }
    return { token, nombre };
  } catch {
    return null;
  }
}

export function limpiarSesionMaestra(): void {
  try {
    localStorage.removeItem(K_TOKEN);
    localStorage.removeItem(K_NOMBRE);
    localStorage.removeItem(K_EXP);
  } catch {
    /* almacenamiento no disponible */
  }
}
