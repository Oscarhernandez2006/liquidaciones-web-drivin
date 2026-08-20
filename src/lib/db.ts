import { Pool } from "pg";

// Pool único reutilizado entre peticiones (evita agotar conexiones en dev con hot-reload).
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

/** true cuando hay configuración de base de datos (DATABASE_URL o variables PG*). */
export function hayBaseDatos(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.PGHOST || process.env.PGDATABASE);
}

/** Devuelve el pool de PostgreSQL. Lanza si no hay configuración. */
export function obtenerPool(): Pool {
  if (!hayBaseDatos()) {
    throw new Error(
      "Base de datos no configurada. Define DATABASE_URL o PGHOST/PGDATABASE en .env.local."
    );
  }

  if (!global._pgPool) {
    const ssl = process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false };
    global._pgPool = process.env.DATABASE_URL
      ? new Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 5 })
      : new Pool({ ssl, max: 5 }); // usa PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE
  }
  return global._pgPool;
}

