import { Elysia, t } from "elysia";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { authed } from "../auth";
import { averageRatings } from "../../lib/ratings";
import { notify } from "../../lib/notify";
import { getPelada, isManagerOrAssistant, isMember, memberIds } from "../../lib/guards";

const { peladas, peladaMembers, peladaAssistants, ratings, ratingRequests, games, users } = schema;

const MAX_MEMBERS = 50;
const MAX_ASSISTANTS = 3;

const weekday = t.Integer({ minimum: 0, maximum: 6 });
const time = t.String({ pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" });

const scheduleFields = t.Object({
  listCapacity: t.Integer({ minimum: 2, maximum: MAX_MEMBERS }),
  keeperCapacity: t.Integer({ minimum: 0, maximum: MAX_MEMBERS }),
  playersPerTeam: t.Integer({ minimum: 2, maximum: 15 }),
  gameWeekday: weekday,
  gameTime: time,
  confirmOpenWeekday: weekday,
  confirmOpenTime: time,
  confirmCloseWeekday: weekday,
  confirmCloseTime: time,
});

// corpos planos (sem t.Intersect — evita validação estrita por membro que rejeita campos extras)
const createBody = t.Object({
  name: t.String({ minLength: 2, maxLength: 80 }),
  selfRating: t.Integer({ minimum: 1, maximum: 5 }),
  ...scheduleFields.properties,
});

const patchBody = t.Partial(
  t.Object({
    name: t.String({ minLength: 2, maxLength: 80 }),
    ...scheduleFields.properties,
  })
);

function publicPelada(p: typeof peladas.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    managerId: p.managerId,
    inviteToken: p.inviteToken,
    listCapacity: p.listCapacity,
    keeperCapacity: p.keeperCapacity,
    playersPerTeam: p.playersPerTeam,
    gameWeekday: p.gameWeekday,
    gameTime: p.gameTime,
    confirmOpenWeekday: p.confirmOpenWeekday,
    confirmOpenTime: p.confirmOpenTime,
    confirmCloseWeekday: p.confirmCloseWeekday,
    confirmCloseTime: p.confirmCloseTime,
    ratingRound: p.ratingRound,
  };
}

export const peladasModule = new Elysia()
  .use(authed)

  .post(
    "/peladas",
    async ({ body, user, status }) => {
      if (!user.canManage) return status(403, { message: "Você não tem permissão para gerenciar uma pelada" });
      const [existing] = await db.select().from(peladas).where(eq(peladas.managerId, user.id)).limit(1);
      if (existing) return status(409, { message: "Você já gerencia uma pelada" });
      const [pelada] = await db
        .insert(peladas)
        .values({ ...body, managerId: user.id, inviteToken: crypto.randomUUID() })
        .returning();
      // manager entra como membro e faz autoavaliação
      await db.insert(peladaMembers).values({ peladaId: pelada.id, userId: user.id });
      await db.insert(ratings).values({
        peladaId: pelada.id,
        raterId: user.id,
        rateeId: user.id,
        stars: body.selfRating,
        round: pelada.ratingRound,
      });
      return publicPelada(pelada);
    },
    { body: createBody }
  )

  .get("/peladas/mine", async ({ user }) => {
    const [managed] = await db.select().from(peladas).where(eq(peladas.managerId, user.id)).limit(1);
    const memberships = await db
      .select({ pelada: peladas })
      .from(peladaMembers)
      .innerJoin(peladas, eq(peladas.id, peladaMembers.peladaId))
      .where(eq(peladaMembers.userId, user.id))
      .orderBy(asc(peladas.name));
    return {
      managed: managed ? publicPelada(managed) : null,
      memberOf: memberships.map((m) => publicPelada(m.pelada)),
    };
  })

  .get("/peladas/:id", async ({ params, user, status }) => {
    const pelada = await getPelada(params.id);
    if (!pelada) return status(404, { message: "Pelada não encontrada" });
    if (!(await isMember(pelada.id, user.id))) return status(403, { message: "Você não é membro desta pelada" });

    const members = await db
      .select({ userId: peladaMembers.userId, joinedAt: peladaMembers.joinedAt, name: users.name, position: users.position })
      .from(peladaMembers)
      .innerJoin(users, eq(users.id, peladaMembers.userId))
      .where(eq(peladaMembers.peladaId, pelada.id))
      .orderBy(asc(peladaMembers.joinedAt));

    const assistants = await db
      .select({ userId: peladaAssistants.userId })
      .from(peladaAssistants)
      .where(eq(peladaAssistants.peladaId, pelada.id));
    const assistantIds = new Set(assistants.map((a) => a.userId));

    const roleOf = (userId: string): "manager" | "assistant" | "member" =>
      userId === pelada.managerId ? "manager" : assistantIds.has(userId) ? "assistant" : "member";

    const averages = await averageRatings(pelada.id);
    return {
      pelada: publicPelada(pelada),
      myRole: roleOf(user.id),
      members: members.map((m) => ({
        userId: m.userId,
        name: m.name,
        position: m.position,
        role: roleOf(m.userId),
        joinedAt: m.joinedAt,
        avgRating: Math.round((averages.get(m.userId) ?? 3) * 100) / 100,
      })),
    };
  })

  .patch(
    "/peladas/:id",
    async ({ params, body, user, status }) => {
      const pelada = await getPelada(params.id);
      if (!pelada) return status(404, { message: "Pelada não encontrada" });
      if (!(await isManagerOrAssistant(pelada.id, user.id))) return status(403, { message: "Apenas o manager ou um auxiliar pode editar" });
      const [updated] = await db.update(peladas).set(body).where(eq(peladas.id, pelada.id)).returning();
      // recria jogos futuros ainda não abertos com a nova configuração
      await db
        .delete(games)
        .where(and(eq(games.peladaId, pelada.id), eq(games.status, "scheduled"), gt(games.confirmOpenAt, new Date())));
      return publicPelada(updated);
    },
    { body: patchBody }
  )

  // ---- auxiliares (máx. 3, só o manager nomeia/remove) ----

  .post(
    "/peladas/:id/assistants",
    async ({ params, body, user, status }) => {
      const pelada = await getPelada(params.id);
      if (!pelada) return status(404, { message: "Pelada não encontrada" });
      if (pelada.managerId !== user.id) return status(403, { message: "Apenas o manager pode nomear auxiliares" });
      if (body.userId === pelada.managerId) return status(400, { message: "O manager não pode ser auxiliar" });
      if (!(await isMember(pelada.id, body.userId))) return status(400, { message: "O usuário não é membro desta pelada" });

      const existing = await db
        .select({ id: peladaAssistants.id })
        .from(peladaAssistants)
        .where(and(eq(peladaAssistants.peladaId, pelada.id), eq(peladaAssistants.userId, body.userId)))
        .limit(1);
      if (existing.length > 0) return status(409, { message: "Este usuário já é auxiliar" });

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(peladaAssistants)
        .where(eq(peladaAssistants.peladaId, pelada.id));
      if (count >= MAX_ASSISTANTS) return status(400, { message: `Limite de ${MAX_ASSISTANTS} auxiliares atingido` });

      await db.insert(peladaAssistants).values({ peladaId: pelada.id, userId: body.userId });
      const [target] = await db.select({ name: users.name }).from(users).where(eq(users.id, body.userId)).limit(1);
      await notify([body.userId], "assistant", { peladaId: pelada.id, peladaName: pelada.name });
      return { ok: true, name: target?.name };
    },
    { body: t.Object({ userId: t.String() }) }
  )

  .delete("/peladas/:id/assistants/:userId", async ({ params, user, status }) => {
    const pelada = await getPelada(params.id);
    if (!pelada) return status(404, { message: "Pelada não encontrada" });
    if (pelada.managerId !== user.id) return status(403, { message: "Apenas o manager pode remover auxiliares" });
    await db
      .delete(peladaAssistants)
      .where(and(eq(peladaAssistants.peladaId, pelada.id), eq(peladaAssistants.userId, params.userId)));
    return { ok: true };
  })

  // ---- convites ----

  .post(
    "/invites/:token/join",
    async ({ params, body, user, status }) => {
      const [pelada] = await db.select().from(peladas).where(eq(peladas.inviteToken, params.token)).limit(1);
      if (!pelada) return status(404, { message: "Convite inválido" });
      if (await isMember(pelada.id, user.id)) return status(409, { message: "Você já está nesta pelada" });

      const others = await memberIds(pelada.id);
      if (others.length >= MAX_MEMBERS) return status(400, { message: "Pelada cheia (50 membros)" });

      await db.insert(peladaMembers).values({ peladaId: pelada.id, userId: user.id });
      // autoavaliação = nota inicial
      await db.insert(ratings).values({
        peladaId: pelada.id,
        raterId: user.id,
        rateeId: user.id,
        stars: body.selfRating,
        round: pelada.ratingRound,
      });
      // membros existentes são convocados a avaliar o novo
      if (others.length > 0) {
        await db.insert(ratingRequests).values(
          others.map((raterId) => ({
            peladaId: pelada.id,
            raterId,
            rateeId: user.id,
            round: pelada.ratingRound,
          }))
        );
        await notify(others, "new_member", {
          peladaId: pelada.id,
          peladaName: pelada.name,
          memberName: user.name,
        });
      }
      return publicPelada(pelada);
    },
    { body: t.Object({ selfRating: t.Integer({ minimum: 1, maximum: 5 }) }) }
  );

/** Rota pública: informações do convite (para a tela de cadastro antes de logar). */
export const invitesPublicModule = new Elysia().get("/invites/:token", async ({ params, status }) => {
  const [pelada] = await db.select().from(peladas).where(eq(peladas.inviteToken, params.token)).limit(1);
  if (!pelada) return status(404, { message: "Convite inválido" });
  const members = await memberIds(pelada.id);
  return {
    peladaId: pelada.id,
    name: pelada.name,
    membersCount: members.length,
    maxMembers: MAX_MEMBERS,
  };
});
