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
    console.log("[db] usando PostgreSQL via DATABASE_URL");
    return drizzlePg(postgres(url, { prepare: false }), { schema });
  }
  // Em produção NUNCA cair no PGlite (banco efêmero) — falhe alto para o problema aparecer
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL não definida em produção. Conecte o plugin PostgreSQL ao serviço na Railway (o serviço deve exibir DATABASE_URL na aba Variables)."
    );
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? "./.pglite";
  console.log(`[db] DATABASE_URL ausente — usando PGlite em ${dir} (dev local)`);
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
