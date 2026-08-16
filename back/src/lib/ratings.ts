import { sql } from "drizzle-orm";
import { executeRaw } from "../db";

/**
 * Média de bolas de cada membro da pelada.
 * Regra: média das avaliações dos outros; se ninguém avaliou ainda, usa a autoavaliação;
 * se nem autoavaliação existir, 3.
 */
export async function averageRatings(peladaId: string): Promise<Map<string, number>> {
  const rows = await executeRaw<{ user_id: string; avg: number }>(sql`
    SELECT
      m.user_id AS user_id,
      COALESCE(
        AVG(CASE WHEN r.rater_id <> r.ratee_id THEN r.stars END),
        MAX(CASE WHEN r.rater_id = r.ratee_id THEN r.stars END),
        3
      )::float AS avg
    FROM pelada_members m
    LEFT JOIN ratings r ON r.pelada_id = m.pelada_id AND r.ratee_id = m.user_id
    WHERE m.pelada_id = ${peladaId}
    GROUP BY m.user_id
  `);
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.user_id, Number(row.avg));
  return map;
}
