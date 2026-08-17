import { eq } from "drizzle-orm";
import { db, schema } from "../db";

const { games, peladas } = schema;

// Jogos criados quando o servidor rodava em UTC guardavam "20:30" como 20:30 UTC,
// e o app (UTC-3) exibia 17:30. Corrige somando 3h, de forma idempotente:
// um jogo só é deslocado se a hora UTC de game_at ainda coincidir com a hora configurada.

const rows = await db.select().from(games);
let shifted = 0;

for (const g of rows) {
  const [p] = await db.select().from(peladas).where(eq(peladas.id, g.peladaId)).limit(1);
  if (!p) continue;
  const cfgHour = Number(p.gameTime.split(":")[0]);
  if (new Date(g.gameAt).getUTCHours() !== cfgHour) continue;

  const shift = (d: Date) => new Date(d.getTime() + 3 * 3600e3);
  await db
    .update(games)
    .set({
      gameAt: shift(g.gameAt),
      confirmOpenAt: shift(g.confirmOpenAt),
      confirmCloseAt: shift(g.confirmCloseAt),
    })
    .where(eq(games.id, g.id));
  shifted++;
}

console.log(`[fix:game-tz] ${shifted} jogo(s) corrigido(s) para o fuso de São Paulo (UTC-3).`);
process.exit(0);