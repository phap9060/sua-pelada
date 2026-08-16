import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

// Com DATABASE_URL (Railway): push direto no Postgres gerenciado.
// Sem DATABASE_URL (local): push no PGlite (arquivo ./.pglite).
export default url
  ? defineConfig({
      dialect: "postgresql",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dbCredentials: { url },
    })
  : defineConfig({
      dialect: "postgresql",
      driver: "pglite",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dbCredentials: { url: process.env.PGLITE_DIR ?? "./.pglite" },
    });
