import bcrypt from "bcryptjs";
import { obtenerPool } from "@/lib/db";

/** Datos de un usuario maestro autenticado (proviene de la tabla `usuarios` del aplicativo). */
export interface MaestroInfo {
  usuario: string;
  nombre: string;
  rol: string;
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
