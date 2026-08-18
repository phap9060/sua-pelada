import { eq } from "drizzle-orm";
import { db, schema } from "../db";

const { peladas, peladaMembers, ratings, ratingRequests } = schema;

// Antes do fix do join, quem entrava não recebia avaliações para quem já estava
// (só a direção "quem já estava avalia o novato" era criada). Este script backfilla
// as requests pendentes da direção que faltou, na rodada atual de cada pelada.
// Modo conservador: pula pares que já têm nota gravada (não reavalia quem já avaliou).
// Idempotente: onConflictDoNothing no índice (peladaId, raterId, rateeId, round).

const allPeladas = await db.select().from(peladas);
let createdRequests = 0;
const benefitedUsers = new Set<string>();

for (const pelada of allPeladas) {
  const members = await db
    .select({ userId: peladaMembers.userId, joinedAt: peladaMembers.joinedAt })
    .from(peladaMembers)
    .where(eq(peladaMembers.peladaId, pelada.id));

  // avaliador entrou depois do avaliado = direção que o bug antigo não criava
  const pairs: { raterId: string; rateeId: string }[] = [];
  for (const rater of members) {
    for (const ratee of members) {
      if (ratee.userId !== rater.userId && ratee.joinedAt < rater.joinedAt) {
        pairs.push({ raterId: rater.userId, rateeId: ratee.userId });
      }
    }
  }
  if (pairs.length === 0) continue;

  const rated = await db
    .select({ raterId: ratings.raterId, rateeId: ratings.rateeId })
    .from(ratings)
    .where(eq(ratings.peladaId, pelada.id));
  const ratedSet = new Set(rated.map((r) => `${r.raterId}:${r.rateeId}`));
  const missing = pairs.filter((p) => !ratedSet.has(`${p.raterId}:${p.rateeId}`));
  if (missing.length === 0) continue;

  const inserted = await db
    .insert(ratingRequests)
    .values(
      missing.map((p) => ({
        peladaId: pelada.id,
        raterId: p.raterId,
        rateeId: p.rateeId,
        round: pelada.ratingRound,
      }))
    )
    .onConflictDoNothing({
      target: [ratingRequests.peladaId, ratingRequests.raterId, ratingRequests.rateeId, ratingRequests.round],
    })
    .returning({ raterId: ratingRequests.raterId });

  createdRequests += inserted.length;
  for (const row of inserted) benefitedUsers.add(row.raterId);
}

console.log(
  `[fix:rating-requests] ${createdRequests} avaliação(ões) pendente(s) criada(s) para ${benefitedUsers.size} usuário(s).`
);
process.exit(0);
