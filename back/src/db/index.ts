import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import * as schema from "./schema";
import type { SQL } from "drizzle-orm";

/**
 * Produção (Railway): usa DATABASE_URL (Postgres gerenciado).
 * Desenvolvimento local: sem DATABASE_URL, usa PGlite (Postgres em WASM, arquivo ./.pglite).
 */
async function createDb(): Promise<PostgresJsDatabase<typeof schema>> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzlePg(postgres(url, { prepare: false }), { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? "./.pglite";
  console.log(`[db] DATABASE_URL ausente — usando PGlite em ${dir}`);
  return drizzlePglite(new PGlite(dir), { schema }) as unknown as PostgresJsDatabase<typeof schema>;
}

export const db = await createDb();
export { schema };

/** Executa SQL cru e normaliza o retorno (postgres-js = array, pglite = { rows }). */
export async function executeRaw<T>(query: SQL): Promise<T[]> {
  const result: unknown = await db.execute(query);
  if (Array.isArray(result)) return result as T[];
  return (result as { rows: T[] }).rows;
}
