// Inicializa la base de datos del portal: crea la tabla liquidaciones_publicadas
// y reporta el conteo. Uso: node db/setup.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const aquiDir = dirname(fileURLToPath(import.meta.url));
const raiz = join(aquiDir, "..");

// Carga simple de .env.local (sin dependencias).
for (const linea of readFileSync(join(raiz, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = linea.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const ssl = process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false };
const client = new pg.Client({ ssl });

try {
  await client.connect();
  console.log(`Conectado a ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`);

  const schema = readFileSync(join(raiz, "db", "schema.sql"), "utf8");
  await client.query(schema);
  console.log("Esquema aplicado: tabla 'liquidaciones_publicadas' lista.");

  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS n FROM liquidaciones_publicadas"
  );
  console.log(`Filas actuales en liquidaciones_publicadas: ${rows[0].n}`);
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
