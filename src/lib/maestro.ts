import bcrypt from "bcryptjs";
import { obtenerPool } from "@/lib/db";

/** Datos de un usuario maestro autenticado (proviene de la tabla `usuarios` del aplicativo). */
export interface MaestroInfo {
  usuario: string;
  nombre: string;
  rol: string;
  activo?: boolean;
}

/**
 * Valida las credenciales de un usuario maestro contra la tabla `usuarios`
 * (la misma que usa el aplicativo de escritorio). La contraseña se verifica
 * contra el hash BCrypt generado por BCrypt.Net ($2a/$2b/$2y).
 */
export async function autenticarMaestro(
  usuario: string,
  contrasena: string
): Promise<MaestroInfo | null> {
  const pool = obtenerPool();

  // Los identificadores de columna del aplicativo son PascalCase (EF Core sin convención snake_case).
  const { rows } = await pool.query(
    `SELECT "NombreUsuario" AS usuario,
            "HashContrasena" AS hash,
            "NombreCompleto" AS nombre,
            "Rol"           AS rol,
            "Activo"        AS activo
       FROM usuarios
      WHERE "NombreUsuario" = $1
      LIMIT 1`,
    [usuario]
  );

  if (rows.length === 0) return null;

  const u = rows[0];
  if (u.activo === false) return null;

  const hash = String(u.hash ?? "");
  const ok = await bcrypt.compare(contrasena, hash).catch(() => false);
  if (!ok) return null;

  return {
    usuario: String(u.usuario),
    nombre: String(u.nombre ?? u.usuario),
    rol: String(u.rol ?? ""),
  };
}

/** Busca un usuario maestro activo por identificador (usuario/cédula). */
export async function obtenerMaestroPorUsuario(usuario: string): Promise<MaestroInfo | null> {
  const pool = obtenerPool();

  const { rows } = await pool.query(
    `SELECT "NombreUsuario" AS usuario,
            "NombreCompleto" AS nombre,
            "Rol"           AS rol,
            "Activo"        AS activo
       FROM usuarios
      WHERE "NombreUsuario" = $1
      LIMIT 1`,
    [usuario]
  );

  if (rows.length === 0) return null;

  const u = rows[0];
  if (u.activo === false) return null;

  return {
    usuario: String(u.usuario),
    nombre: String(u.nombre ?? u.usuario),
    rol: String(u.rol ?? ""),
    activo: Boolean(u.activo),
  };
}

export async function listarRolesMaestro(): Promise<string[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT DISTINCT "Rol" AS rol
       FROM usuarios
      WHERE COALESCE("Rol", '') <> ''
      ORDER BY "Rol"`
  );
  const roles = rows.map((r) => String(r.rol ?? "").trim()).filter(Boolean);
  if (!roles.includes("maestro")) roles.push("maestro");
  return Array.from(new Set(roles));
}

export async function listarMaestrosProvisioning(): Promise<
  Array<{ cedula: string; nombre: string; email: null; rol: string; activo: boolean; permisos: string[] }>
> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT "NombreUsuario" AS usuario,
            "NombreCompleto" AS nombre,
            "Rol" AS rol,
            "Activo" AS activo
       FROM usuarios
      ORDER BY "NombreCompleto" NULLS LAST, "NombreUsuario"`
  );

  return rows.map((r) => ({
    cedula: String(r.usuario ?? "").trim(),
    nombre: String(r.nombre ?? r.usuario ?? "").trim(),
    email: null,
    rol: String(r.rol ?? ""),
    activo: Boolean(r.activo),
    permisos: [],
  }));
}

export async function obtenerMaestroProvisioning(cedula: string) {
  const user = await obtenerMaestroPorUsuario(String(cedula || "").trim());
  if (!user) return null;
  return {
    cedula: user.usuario,
    nombre: user.nombre,
    email: null,
    rol: user.rol,
    activo: Boolean(user.activo ?? true),
    permisos: [] as string[],
  };
}

export async function upsertMaestroProvisioning(input: {
  cedula?: string;
  email?: string;
  nombre?: string;
  rol?: string;
  activo?: boolean;
  password?: string;
}) {
  const cedula = String(input.cedula ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const nombre = String(input.nombre ?? "").trim();
  if (!cedula && !email) throw new Error("Se requiere cédula o email");

  const usuario = cedula || email;
  const activo = input.activo ?? true;
  const rol = String(input.rol ?? "").trim() || "maestro";
  const pool = obtenerPool();

  const existing = await obtenerMaestroPorUsuario(usuario);
  const hash = input.password ? await bcrypt.hash(input.password, 10) : null;

  if (existing) {
    await pool.query(
      `UPDATE usuarios
          SET "NombreCompleto" = $1,
              "Rol" = $2,
              "Activo" = $3,
              "HashContrasena" = COALESCE($4, "HashContrasena")
        WHERE "NombreUsuario" = $5`,
      [nombre || existing.nombre || usuario, rol, activo, hash, usuario]
    );
    return { ok: true, action: "updated", id: usuario };
  }

  await pool.query(
    `INSERT INTO usuarios ("NombreUsuario", "HashContrasena", "NombreCompleto", "Rol", "Activo")
     VALUES ($1, $2, $3, $4, $5)`,
    [usuario, hash ?? (await bcrypt.hash("Admin2024*", 10)), nombre || usuario, rol, activo]
  );
  return { ok: true, action: "created", id: usuario };
}

export async function setEstadoMaestroProvisioning(cedula: string, activo: boolean) {
  const pool = obtenerPool();
  const res = await pool.query(
    `UPDATE usuarios SET "Activo" = $1 WHERE "NombreUsuario" = $2 RETURNING "NombreUsuario"`,
    [activo, String(cedula || "").trim()]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function setPasswordMaestroProvisioning(cedula: string, password: string) {
  const pool = obtenerPool();
  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query(
    `UPDATE usuarios SET "HashContrasena" = $1 WHERE "NombreUsuario" = $2 RETURNING "NombreUsuario"`,
    [hash, String(cedula || "").trim()]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function setPermisosMaestroProvisioning(cedula: string, rol?: string) {
  if (!rol) return true;
  const pool = obtenerPool();
  const res = await pool.query(
    `UPDATE usuarios SET "Rol" = $1 WHERE "NombreUsuario" = $2 RETURNING "NombreUsuario"`,
    [String(rol).trim() || "maestro", String(cedula || "").trim()]
  );
  return (res.rowCount ?? 0) > 0;
}

/** Domiciliario con al menos una liquidación publicada. */
export interface DomiciliarioPublicado {
  documento: string;
  codigoVehiculo: string;
  nombre: string;
  pdv: string;
  cantidad: number;
}

/** Lista los domiciliarios que tienen liquidaciones publicadas (para el selector del maestro). */
export async function listarDomiciliariosPublicados(): Promise<DomiciliarioPublicado[]> {
  const pool = obtenerPool();

  const { rows } = await pool.query(
    `SELECT documento,
            codigo_vehiculo,
            MAX(nombre) AS nombre,
            MAX(pdv)    AS pdv,
            COUNT(*)    AS cantidad
       FROM liquidaciones_publicadas
      GROUP BY documento, codigo_vehiculo
      ORDER BY MAX(nombre)`
  );

  return rows.map((r) => ({
    documento: r.documento,
    codigoVehiculo: r.codigo_vehiculo,
    nombre: r.nombre ?? "",
    pdv: r.pdv ?? "",
    cantidad: Number(r.cantidad),
  }));
}
