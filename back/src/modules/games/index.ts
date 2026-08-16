import { Elysia, t } from "elysia";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../../db";
import { authed } from "../auth";
import { getPelada, isMember } from "../../lib/guards";
import { ensureCurrentGame, goalkeeperState } from "../../lib/draw";

const { games, gameConfirmations, teams, teamPlayers, users, peladas } = schema;

async function gamePayload(game: typeof games.$inferSelect, listCapacity: number, userId: string) {
  const confirmations = await db
    .select({
      userId: gameConfirmations.userId,
      name: users.name,
      position: users.position,
      confirmedAt: gameConfirmations.confirmedAt,
    })
    .from(gameConfirmations)
    .innerJoin(users, eq(users.id, gameConfirmations.userId))
    .where(eq(gameConfirmations.gameId, game.id))
    .orderBy(asc(gameConfirmations.confirmedAt));

  const teamRows = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      queueOrder: teams.queueOrder,
      isChampion: teams.isChampion,
      playerId: teamPlayers.userId,
      playerName: users.name,
      playerPosition: users.position,
    })
    .from(teams)
    .leftJoin(teamPlayers, eq(teamPlayers.teamId, teams.id))
    .leftJoin(users, eq(users.id, teamPlayers.userId))
    .where(eq(teams.gameId, game.id))
    .orderBy(asc(teams.queueOrder));

  const teamMap = new Map<
    string,
    { id: string; name: string; queueOrder: number; isChampion: boolean; players: { id: string; name: string; position: string }[] }
  >();
  for (const row of teamRows) {
    if (!teamMap.has(row.teamId)) {
      teamMap.set(row.teamId, { id: row.teamId, name: row.teamName, queueOrder: row.queueOrder, isChampion: row.isChampion, players: [] });
    }
    if (row.playerId) teamMap.get(row.teamId)!.players.push({ id: row.playerId, name: row.playerName!, position: row.playerPosition! });
  }
  // goleiro primeiro no time
  for (const team of teamMap.values()) {
    team.players.sort((a, b) => (a.position === "keeper" ? -1 : 0) - (b.position === "keeper" ? -1 : 0));
  }

  // goleiros do jogo: em time (teamId) ou na fila de rotação (teamId null), em ordem de confirmação
  const { inTeams, rotation } = await goalkeeperState(game.id);
  const titulares = confirmations.slice(0, listCapacity);
  const goalkeepers = titulares
    .filter((c) => c.position === "keeper")
    .map((c) => ({ userId: c.userId, name: c.name, teamId: inTeams.get(c.userId) ?? null }));

  let championGoalkeeper: { id: string; name: string } | null = null;
  if (game.championGoalkeeperId) {
    const [keeper] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, game.championGoalkeeperId)).limit(1);
    if (keeper) championGoalkeeper = keeper;
  }

  return {
    id: game.id,
    status: game.status,
    gameAt: game.gameAt,
    confirmOpenAt: game.confirmOpenAt,
    confirmCloseAt: game.confirmCloseAt,
    titulares: titulares.map((c) => ({ ...c, kind: "titular" as const })),
    suplentes: confirmations.slice(listCapacity).map((c) => ({ ...c, kind: "suplente" as const })),
    myConfirmation: confirmations.some((c) => c.userId === userId),
    teams: [...teamMap.values()],
    // fila de rotação (quando há menos goleiros que times) — goleiros sem time fixo
    rotatingGoalkeepers: rotation.map((r) => ({
      userId: r.userId,
      name: goalkeepers.find((g) => g.userId === r.userId)?.name ?? "",
    })),
    goalkeepers,
    championGoalkeeper,
  };
}

export const gamesModule = new Elysia()
  .use(authed)

  // jogo da rodada atual da pelada (cria sob demanda se necessário)
  .get("/peladas/:id/game", async ({ params, user, status }) => {
    const pelada = await getPelada(params.id);
    if (!pelada) return status(404, { message: "Pelada não encontrada" });
    if (!(await isMember(pelada.id, user.id))) return status(403, { message: "Você não é membro desta pelada" });
    const game = await ensureCurrentGame(pelada);
    return gamePayload(game, pelada.listCapacity, user.id);
  })

  // confirmar presença (ordem de clique define titulares e suplentes)
  .post("/games/:id/confirm", async ({ params, user, status }) => {
    const [game] = await db.select().from(games).where(eq(games.id, params.id)).limit(1);
    if (!game) return status(404, { message: "Jogo não encontrado" });
    if (!(await isMember(game.peladaId, user.id))) return status(403, { message: "Você não é membro desta pelada" });
    const now = new Date();
    if (now < game.confirmOpenAt) return status(400, { message: "A confirmação ainda não abriu" });
    if (now >= game.confirmCloseAt || game.status === "drawn" || game.status === "finished") {
      return status(400, { message: "A confirmação já fechou" });
    }
    await db
      .insert(gameConfirmations)
      .values({ gameId: game.id, userId: user.id })
      .onConflictDoNothing({ target: [gameConfirmations.gameId, gameConfirmations.userId] });
    const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
    return gamePayload(game, pelada.listCapacity, user.id);
  })

  // desistir (antes do sorteio); suplente sobe automaticamente pela ordem
  .delete("/games/:id/confirm", async ({ params, user, status }) => {
    const [game] = await db.select().from(games).where(eq(games.id, params.id)).limit(1);
    if (!game) return status(404, { message: "Jogo não encontrado" });
    if (game.status === "drawn" || game.status === "finished") {
      return status(400, { message: "O sorteio já foi feito" });
    }
    await db
      .delete(gameConfirmations)
      .where(and(eq(gameConfirmations.gameId, game.id), eq(gameConfirmations.userId, user.id)));
    const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
    return gamePayload(game, pelada.listCapacity, user.id);
  })

  // manager consagra o time campeão do dia
  .post(
    "/games/:id/champion",
    async ({ params, body, user, status }) => {
      const [game] = await db.select().from(games).where(eq(games.id, params.id)).limit(1);
      if (!game) return status(404, { message: "Jogo não encontrado" });
      const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
      if (pelada.managerId !== user.id) return status(403, { message: "Apenas o manager pode consagrar o campeão" });
      if (game.status !== "drawn") return status(400, { message: "O sorteio ainda não aconteceu" });
      const [team] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.id, body.teamId), eq(teams.gameId, game.id)))
        .limit(1);
      if (!team) return status(404, { message: "Time não encontrado neste jogo" });
      await db.update(teams).set({ isChampion: true }).where(eq(teams.id, team.id));
      await db.update(games).set({ status: "finished" }).where(eq(games.id, game.id));
      return gamePayload({ ...game, status: "finished" }, pelada.listCapacity, user.id);
    },
    { body: t.Object({ teamId: t.String() }) }
  )

  // manager consagra o goleiro campeão do dia (independente do time campeão)
  .post(
    "/games/:id/champion-goalkeeper",
    async ({ params, body, user, status }) => {
      const [game] = await db.select().from(games).where(eq(games.id, params.id)).limit(1);
      if (!game) return status(404, { message: "Jogo não encontrado" });
      const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
      if (pelada.managerId !== user.id) return status(403, { message: "Apenas o manager pode consagrar o campeão" });
      if (game.status !== "drawn" && game.status !== "finished") {
        return status(400, { message: "O sorteio ainda não aconteceu" });
      }
      // candidato: goleiro presente no jogo (em time ou na fila de rotação)
      const { inTeams, rotation } = await goalkeeperState(game.id);
      const keeperIds = new Set([...inTeams.keys(), ...rotation.map((r) => r.userId)]);
      if (!keeperIds.has(body.userId)) {
        return status(400, { message: "Goleiro não está neste jogo" });
      }
      await db.update(games).set({ championGoalkeeperId: body.userId }).where(eq(games.id, game.id));
      return gamePayload({ ...game, championGoalkeeperId: body.userId }, pelada.listCapacity, user.id);
    },
    { body: t.Object({ userId: t.String() }) }
  );
