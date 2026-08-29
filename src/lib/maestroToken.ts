import crypto from "crypto";

// Token de sesión maestra: cuerpo (base64url) + firma HMAC-SHA256. Sin estado en servidor.
const TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

function secreto(): string {
  return (
    process.env.MAESTRO_SECRET ||
    process.env.PGPASSWORD ||
    process.env.DATABASE_URL ||
    "vld-maestro-secret-cambia-esto"
  );
}

function firmar(cuerpo: string): string {
  return crypto.createHmac("sha256", secreto()).update(cuerpo).digest("base64url");
}

export function crearTokenMaestro(usuario: string, nombre: string): string {
  const cuerpo = Buffer.from(
    JSON.stringify({ u: usuario, n: nombre, exp: Date.now() + TTL_MS })
  ).toString("base64url");
  return `${cuerpo}.${firmar(cuerpo)}`;
}

export interface MaestroToken {
  usuario: string;
  nombre: string;
}

/** Devuelve los datos del token si la firma es válida y no expiró; null en caso contrario. */
export function verificarTokenMaestro(token: string | null | undefined): MaestroToken | null {
  if (!token) return null;

  const partes = token.split(".");
  if (partes.length !== 2) return null;

  const [cuerpo, firma] = partes;
  const esperado = firmar(cuerpo);

  const a = Buffer.from(firma);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(cuerpo, "base64url").toString());
    if (!data.exp || Date.now() > Number(data.exp)) return null;
    return { usuario: String(data.u), nombre: String(data.n) };
  } catch {
    return null;
  }
}
