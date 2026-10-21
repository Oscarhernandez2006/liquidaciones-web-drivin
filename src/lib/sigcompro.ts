/**
 * Cliente server-to-server hacia SIGCOMPRO (solicitudes de almuerzo).
 * Solo debe importarse desde rutas /api: usa el secreto compartido.
 */
export class ErrorSigcompro extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function config() {
  const url = String(process.env.SIGCOMPRO_API_URL ?? "").trim().replace(/\/+$/, "");
  const secret = String(process.env.SIGCOMPRO_SHARED_SECRET || process.env.SSO_SHARED_SECRET || "").trim();
  if (!url || !secret) throw new ErrorSigcompro("La conexión con SIGCOMPRO no está configurada.", 503);
  return { url, secret };
}

export async function llamarSigcompro<T>(ruta: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { url, secret } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.SIGCOMPRO_TIMEOUT_MS ?? 8000));
  let res: Response;
  try {
    res = await fetch(`${url}${ruta}`, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json", "X-SSO-Secret": secret },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    throw new ErrorSigcompro("No fue posible comunicarse con SIGCOMPRO.", 502);
  } finally {
    clearTimeout(timeout);
  }
  const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data?.message.join(" ") : data?.message;
    // Solo se reenvían al domiciliario los mensajes de validación (4xx).
    throw new ErrorSigcompro(
      res.status < 500 && res.status !== 401 && msg ? msg : "SIGCOMPRO no pudo procesar la solicitud.",
      res.status < 500 && res.status !== 401 ? res.status : 502,
    );
  }
  return data as T;
}

export function documentoValido(valor: unknown): string | null {
  const doc = String(valor ?? "").replace(/\D/g, "");
  return doc.length >= 5 && doc.length <= 15 ? doc : null;
}
