import { Elysia, t } from "elysia";
import { and, asc, eq, isNull, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { authed } from "../auth";
import { getPelada, isMember, memberIds } from "../../lib/guards";
import { notify } from "../../lib/notify";

const { ratings, ratingRequests, peladas, peladaMembers, users } = schema;

export const ratingsModule = new Elysia()
  .use(authed)

  // minhas avaliações pendentes (em todas as peladas)
  .get("/ratings/pending", async ({ user }) => {
    const rows = await db
      .select({
        requestId: ratingRequests.id,
        peladaId: ratingRequests.peladaId,
        peladaName: peladas.name,
        rateeId: ratingRequests.rateeId,
        rateeName: users.name,
        rateePosition: users.position,
        round: ratingRequests.round,
      })
      .from(ratingRequests)
      .innerJoin(peladas, eq(peladas.id, ratingRequests.peladaId))
      .innerJoin(users, eq(users.id, ratingRequests.rateeId))
      .where(and(eq(ratingRequests.raterId, user.id), isNull(ratingRequests.completedAt)))
      .orderBy(asc(ratingRequests.createdAt));
    return rows;
  })

  // completar uma avaliação (1-5 bolas)
  .post(
    "/ratings/complete",
    async ({ body, user, status }) => {
      const [request] = await db
        .select()
        .from(ratingRequests)
        .where(eq(ratingRequests.id, body.requestId))
        .limit(1);
      if (!request || request.raterId !== user.id) return status(404, { message: "Avaliação não encontrada" });
      if (request.completedAt) return status(409, { message: "Avaliação já enviada" });

      // nova nota substitui a anterior (mesma pelada + avaliador + avaliado)
      await db
        .insert(ratings)
        .values({
          peladaId: request.peladaId,
          raterId: user.id,
          rateeId: request.rateeId,
          stars: body.stars,
          round: request.round,
        })
        .onConflictDoUpdate({
          target: [ratings.peladaId, ratings.raterId, ratings.rateeId],
          set: { stars: body.stars, round: request.round, createdAt: new Date() },
        });
      await db
        .update(ratingRequests)
        .set({ completedAt: new Date() })
        .where(eq(ratingRequests.id, request.id));
      return { ok: true };
    },
    { body: t.Object({ requestId: t.String(), stars: t.Integer({ minimum: 1, maximum: 5 }) }) }
  )

  // manager dispara nova rodada geral de avaliações (substitui as notas)
  .post("/peladas/:id/rating-round", async ({ params, user, status }) => {
    const pelada = await getPelada(params.id);
    if (!pelada) return status(404, { message: "Pelada não encontrada" });
    if (pelada.managerId !== user.id) return status(403, { message: "Apenas o manager pode disparar a rodada" });

    const newRound = pelada.ratingRound + 1;
    await db.update(peladas).set({ ratingRound: newRound }).where(eq(peladas.id, pelada.id));
    // pendências da rodada anterior são descartadas
    await db
      .delete(ratingRequests)
      .where(and(eq(ratingRequests.peladaId, pelada.id), isNull(ratingRequests.completedAt), lt(ratingRequests.round, newRound)));

    const members = await memberIds(pelada.id);
    const requests = members.flatMap((raterId) =>
      members.filter((rateeId) => rateeId !== raterId).map((rateeId) => ({ peladaId: pelada.id, raterId, rateeId, round: newRound }))
    );
    if (requests.length > 0) {
      await db
        .insert(ratingRequests)
        .values(requests)
        .onConflictDoNothing({ target: [ratingRequests.peladaId, ratingRequests.raterId, ratingRequests.rateeId, ratingRequests.round] });
    }
    await notify(members, "rating_round", { peladaId: pelada.id, peladaName: pelada.name, round: newRound });
    return { ok: true, round: newRound };
  });
