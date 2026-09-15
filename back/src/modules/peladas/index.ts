import { Elysia, t } from "elysia";
import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { authed } from "../auth";
import { averageRatings, isValidStars } from "../../lib/ratings";
import { notify } from "../../lib/notify";
import { getPelada, isManagerOrAssistant, isMember, memberIds } from "../../lib/guards";

const { peladas, peladaMembers, peladaAssistants, peladaExits, ratings, ratingRequests, games, gameConfirmations, users } = schema;

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
  gameDuration: t.Integer({ minimum: 15, maximum: 480 }),
  confirmOpenWeekday: weekday,
  confirmOpenTime: time,
  confirmCloseWeekday: weekday,
  confirmCloseTime: time,
  useExternalList: t.Boolean({ default: false }),
});

// corpos planos (sem t.Intersect — evita validação estrita por membro que rejeita campos extras)
const createBody = t.Object({
  name: t.String({ minLength: 2, maxLength: 80 }),
  selfRating: t.Number({ minimum: 1, maximum: 5 }),
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
    gameDuration: p.gameDuration,
    confirmOpenWeekday: p.confirmOpenWeekday,
    confirmOpenTime: p.confirmOpenTime,
    confirmCloseWeekday: p.confirmCloseWeekday,
    confirmCloseTime: p.confirmCloseTime,
    useExternalList: p.useExternalList,
    ratingRound: p.ratingRound,
  };
}

/**
 * Remove um jogador da pelada: registra na lista de desistentes, tira o cargo de
 * auxiliar (se tiver), apaga associação, notas e pendências de avaliação, e cancela
 * confirmações dos próximos jogos. O histórico de times já sorteados é preservado
 * (títulos continuam nas estatísticas).
 */
async function removeFromPelada(peladaId: string, target: { userId: string; name: string }) {
  await db
    .insert(peladaExits)
    .values({ peladaId, userId: target.userId, name: target.name })
    .onConflictDoNothing({ target: [peladaExits.peladaId, peladaExits.userId] });
  await db
    .delete(peladaAssistants)
    .where(and(eq(peladaAssistants.peladaId, peladaId), eq(peladaAssistants.userId, target.userId)));
  await db
    .delete(peladaMembers)
    .where(and(eq(peladaMembers.peladaId, peladaId), eq(peladaMembers.userId, target.userId)));
  await db
    .delete(ratings)
    .where(
      and(
        eq(ratings.peladaId, peladaId),
        or(eq(ratings.raterId, target.userId), eq(ratings.rateeId, target.userId))
      )
    );
  await db
    .delete(ratingRequests)
    .where(
      and(
        eq(ratingRequests.peladaId, peladaId),
        or(eq(ratingRequests.raterId, target.userId), eq(ratingRequests.rateeId, target.userId))
      )
    );
  const upcoming = await db
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.peladaId, peladaId), inArray(games.status, ["scheduled", "open"])));
  if (upcoming.length > 0) {
    await db
      .delete(gameConfirmations)
      .where(
        and(
          inArray(gameConfirmations.gameId, upcoming.map((g) => g.id)),
          eq(gameConfirmations.userId, target.userId)
        )
      );
  }
}

export const peladasModule = new Elysia()
  .use(authed)

  .post(
    "/peladas",
    async ({ body, user, status }) => {
      if (!user.canManage) return status(403, { message: "Você não tem permissão para gerenciar uma pelada" });
      if (!isValidStars(body.selfRating)) return status(400, { message: "A nota inicial vai de 1 a 5 em passos de 0,5" });
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
      .select({
        userId: peladaMembers.userId,
        joinedAt: peladaMembers.joinedAt,
        name: users.name,
        position: users.position,
        fieldPosition: users.fieldPosition,
        fieldPositionSecondary: users.fieldPositionSecondary,
      })
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
    const exits = await db
      .select({ userId: peladaExits.userId, name: peladaExits.name, exitedAt: peladaExits.exitedAt })
      .from(peladaExits)
      .where(eq(peladaExits.peladaId, pelada.id))
      .orderBy(desc(peladaExits.exitedAt));
    return {
      pelada: publicPelada(pelada),
      myRole: roleOf(user.id),
      members: members.map((m) => ({
        userId: m.userId,
        name: m.name,
        position: m.position,
        fieldPosition: m.fieldPosition,
        fieldPositionSecondary: m.fieldPositionSecondary,
        role: roleOf(m.userId),
        joinedAt: m.joinedAt,
        avgRating: Math.round((averages.get(m.userId) ?? 3) * 100) / 100,
      })),
      exits,
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

  // ---- remoção de membros ----

  // manager ou auxiliar remove um jogador da lista
  .delete("/peladas/:id/members/:userId", async ({ params, user, status }) => {
    const pelada = await getPelada(params.id);
    if (!pelada) return status(404, { message: "Pelada não encontrada" });
    if (!(await isManagerOrAssistant(pelada.id, user.id)))
      return status(403, { message: "Apenas o manager ou um auxiliar pode remover membros" });
    if (params.userId === pelada.managerId) return status(400, { message: "O manager não pode ser removido" });
    if (params.userId === user.id) return status(400, { message: "Use a opção 'Sair da pelada' para remover a si mesmo" });
    if (!(await isMember(pelada.id, params.userId))) return status(404, { message: "Este jogador não é membro desta pelada" });
    const [target] = await db.select({ name: users.name }).from(users).where(eq(users.id, params.userId)).limit(1);
    await removeFromPelada(pelada.id, { userId: params.userId, name: target?.name ?? "Jogador" });
    await notify([params.userId], "removed", { peladaId: pelada.id, peladaName: pelada.name });
    return { ok: true };
  })

  // manager/auxiliar reseta a senha de um membro: senha fica pelada e a conta cria uma nova no próximo login
  .post(
    "/peladas/:id/members/:userId/reset-password",
    async ({ params, user, status }) => {
      const pelada = await getPelada(params.id);
      if (!pelada) return status(404, { message: "Pelada não encontrada" });
      if (!(await isManagerOrAssistant(pelada.id, user.id)))
        return status(403, { message: "Apenas o manager ou um auxiliar pode resetar a senha" });
      if (params.userId === user.id) return status(400, { message: "Use 'Sua senha' para trocar a própria senha" });
      if (!(await isMember(pelada.id, params.userId))) return status(404, { message: "Este jogador não é membro desta pelada" });

      // hierarquia: manager reseta qualquer um menos ele mesmo; auxiliar só reseta membros comuns
      const [peladaRow] = await db.select({ managerId: peladas.managerId }).from(peladas).where(eq(peladas.id, pelada.id)).limit(1);
      const isManager = peladaRow?.managerId === user.id;
      if (!isManager) {
        const isAssistant = await isManagerOrAssistant(pelada.id, params.userId);
        if (isAssistant) return status(403, { message: "Auxiliares só podem resetar a senha de membros comuns" });
      }

      const [target] = await db.select({ name: users.name }).from(users).where(eq(users.id, params.userId)).limit(1);
      // hash descartável: a senha antiga deixa de valer em qualquer lugar
      const randomHash = await Bun.password.hash(crypto.randomUUID(), { algorithm: "bcrypt", cost: 10 });
      await db
        .update(users)
        .set({ passwordHash: randomHash, mustResetPassword: true })
        .where(eq(users.id, params.userId));

      await notify([params.userId], "password_reset", { peladaId: pelada.id, peladaName: pelada.name });
      return { ok: true, name: target?.name ?? "Jogador" };
    },
    { params: t.Object({ id: t.String(), userId: t.String() }) }
  )

  // o próprio jogador sai da pelada
  .delete("/peladas/:id/leave", async ({ params, user, status }) => {
    const pelada = await getPelada(params.id);
    if (!pelada) return status(404, { message: "Pelada não encontrada" });
    if (!(await isMember(pelada.id, user.id))) return status(400, { message: "Você não é membro desta pelada" });
    if (pelada.managerId === user.id) return status(400, { message: "O manager não pode sair da própria pelada" });
    await removeFromPelada(pelada.id, { userId: user.id, name: user.name });
    await notify([pelada.managerId], "member_left", {
      peladaId: pelada.id,
      peladaName: pelada.name,
      memberName: user.name,
    });
    return { ok: true };
  })

  // ---- convites ----

  .post(
    "/invites/:token/join",
    async ({ params, body, user, status }) => {
      const [pelada] = await db.select().from(peladas).where(eq(peladas.inviteToken, params.token)).limit(1);
      if (!pelada) return status(404, { message: "Convite inválido" });
      if (await isMember(pelada.id, user.id)) return status(409, { message: "Você já está nesta pelada" });
      if (!isValidStars(body.selfRating)) return status(400, { message: "A nota inicial vai de 1 a 5 em passos de 0,5" });

      const others = await memberIds(pelada.id);
      if (others.length >= MAX_MEMBERS) return status(400, { message: "Pelada cheia (50 membros)" });

      await db.insert(peladaMembers).values({ peladaId: pelada.id, userId: user.id });
      // quem voltou pelo convite some da lista de desistentes
      await db
        .delete(peladaExits)
        .where(and(eq(peladaExits.peladaId, pelada.id), eq(peladaExits.userId, user.id)));
      // autoavaliação = nota inicial
      await db.insert(ratings).values({
        peladaId: pelada.id,
        raterId: user.id,
        rateeId: user.id,
        stars: body.selfRating,
        round: pelada.ratingRound,
      });
      // existentes avaliam o novo, e o novo avalia quem já estava
      if (others.length > 0) {
        await db
          .insert(ratingRequests)
          .values(
            [
              ...others.map((raterId) => ({ raterId, rateeId: user.id })),
              ...others.map((rateeId) => ({ raterId: user.id, rateeId })),
            ].map((r) => ({ ...r, peladaId: pelada.id, round: pelada.ratingRound }))
          )
          .onConflictDoNothing({ target: [ratingRequests.peladaId, ratingRequests.raterId, ratingRequests.rateeId, ratingRequests.round] });
        await notify(others, "new_member", {
          peladaId: pelada.id,
          peladaName: pelada.name,
          memberName: user.name,
        });
      }
      return publicPelada(pelada);
    },
    { body: t.Object({ selfRating: t.Number({ minimum: 1, maximum: 5 }) }) }
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
