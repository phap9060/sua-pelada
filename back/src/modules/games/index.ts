import { Elysia, t } from "elysia";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../../db";
import { authed } from "../auth";
import { getPelada, isManagerOrAssistant, isMember } from "../../lib/guards";
import { ensureCurrentGame, getEntries, getQuotaLists, goalkeeperState, performExternalDraw } from "../../lib/draw";
import type { FieldPosition } from "../../db/schema";

const { games, gameConfirmations, teams, teamPlayers, users, peladas, gameEntries, teamEntries } = schema;

type Placement = { group: "line" | "keeper"; kind: "titular" | "suplente"; pos: number; total: number } | null;

// item da lista externa: membro (userId) OU jogador externo (name + rating)
const entryItem = t.Object({
  userId: t.Optional(t.String()),
  name: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  rating: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
});

interface ConfirmRow {
  userId: string;
  name: string;
  position: string;
  confirmedAt: Date;
}

function buildGroup(
  group: "line" | "keeper",
  titulares: ConfirmRow[],
  suplentes: ConfirmRow[],
  capacity: number,
  userId: string
) {  const withPos = {
    titulares: titulares.map((c, i) => ({ ...c, pos: i + 1 })),
    suplentes: suplentes.map((c, i) => ({ ...c, pos: i + 1 })),
  };
  let myPlacement: Placement = null;
  const tIdx = withPos.titulares.findIndex((c) => c.userId === userId);
  if (tIdx >= 0) {
    myPlacement = { group, kind: "titular", pos: tIdx + 1, total: capacity };
  } else {
    const sIdx = withPos.suplentes.findIndex((c) => c.userId === userId);
    if (sIdx >= 0) {
      myPlacement = { group, kind: "suplente", pos: sIdx + 1, total: withPos.suplentes.length };
    }
  }
  return { group: withPos, myPlacement };
}

async function gamePayload(game: typeof games.$inferSelect, pelada: typeof peladas.$inferSelect, userId: string) {
  const external = pelada.useExternalList;

  // ---------- grupos (modo normal: confirmações; modo externo: lista digitada) ----------
  let lineGroup: ReturnType<typeof buildGroup>["group"];
  let keeperGroup: ReturnType<typeof buildGroup>["group"];
  let myPlacement: Placement = null;
  let entriesPayload: {
    id: string;
    name: string;
    group: "line" | "keeper";
    rating: number;
    userId: string | null;
    isExternal: boolean;
  }[] = [];

  if (external) {
    const entries = await getEntries(game.id);
    // nomes dos membros vêm do cadastro (entry de membro é gravada só com userId)
    const memberIdsInEntries = entries.filter((e) => e.userId).map((e) => e.userId!);
    const memberRows = memberIdsInEntries.length
      ? await db
          .select({ id: users.id, name: users.name, position: users.position })
          .from(users)
          .where(inArray(users.id, memberIdsInEntries))
      : [];
    const memberNameMap = new Map(memberRows.map((m) => [m.id, m]));
    entriesPayload = entries.map((e) => ({
      id: e.id,
      name: e.userId ? (memberNameMap.get(e.userId)?.name ?? "?") : e.name,
      group: e.group,
      rating: Math.round(e.rating * 100) / 100,
      userId: e.userId,
      isExternal: !e.userId,
    }));
    const asRow = (e: (typeof entries)[number]) => ({
      userId: e.userId ?? e.id,
      name: e.userId ? (memberNameMap.get(e.userId)?.name ?? "?") : e.name,
      position: e.group,
      confirmedAt: new Date(0),
    });
    lineGroup = buildGroup("line", entries.filter((e) => e.group === "line").map(asRow), [], pelada.listCapacity, userId).group;
    keeperGroup = buildGroup("keeper", entries.filter((e) => e.group === "keeper").map(asRow), [], pelada.keeperCapacity, userId).group;
  } else {
    const quotas = await getQuotaLists(game.id, pelada.listCapacity, pelada.keeperCapacity);

    // nomes e posições dos confirmados
    const allIds = [...quotas.line.titulares, ...quotas.line.suplentes, ...quotas.keepers.titulares, ...quotas.keepers.suplentes].map(
      (c) => c.userId
    );
    const names = allIds.length
      ? await db
          .select({
            id: users.id,
            name: users.name,
            position: users.position,
            fieldPosition: users.fieldPosition,
            fieldPositionSecondary: users.fieldPositionSecondary,
          })
          .from(users)
          .where(inArray(users.id, allIds))
      : [];
    const nameMap = new Map(names.map((n) => [n.id, n]));

    const withName = (c: { userId: string; confirmedAt: Date }) => ({
      userId: c.userId,
      name: nameMap.get(c.userId)?.name ?? "?",
      position: (nameMap.get(c.userId)?.position ?? "line") as string,
      fieldPosition: nameMap.get(c.userId)?.fieldPosition ?? "meia",
      fieldPositionSecondary: nameMap.get(c.userId)?.fieldPositionSecondary ?? null,
      confirmedAt: c.confirmedAt,
    }) satisfies { userId: string; name: string; position: string; fieldPosition: FieldPosition; fieldPositionSecondary: FieldPosition | null; confirmedAt: Date };

    const lineBuilt = buildGroup("line", quotas.line.titulares.map(withName), quotas.line.suplentes.map(withName), pelada.listCapacity, userId);
    const keeperBuilt = buildGroup(
      "keeper",
      quotas.keepers.titulares.map(withName),
      quotas.keepers.suplentes.map(withName),
      pelada.keeperCapacity,
      userId
    );
    lineGroup = lineBuilt.group;
    keeperGroup = keeperBuilt.group;
    myPlacement = lineBuilt.myPlacement ?? keeperBuilt.myPlacement;
  }

  // ---------- times (membros em teamPlayers; externos em teamEntries) ----------
  const teamRows = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      queueOrder: teams.queueOrder,
      isChampion: teams.isChampion,
      playerId: teamPlayers.userId,
      playerName: users.name,
      playerPosition: users.position,
      playerFieldPosition: users.fieldPosition,
      playerFieldPositionSecondary: users.fieldPositionSecondary,
    })
    .from(teams)
    .leftJoin(teamPlayers, eq(teamPlayers.teamId, teams.id))
    .leftJoin(users, eq(users.id, teamPlayers.userId))
    .where(eq(teams.gameId, game.id))
    .orderBy(asc(teams.queueOrder));

  const externalRows = await db
    .select({
      teamId: teamEntries.teamId,
      entryId: gameEntries.id,
      entryName: gameEntries.name,
      entryGroup: gameEntries.group,
      entryRating: gameEntries.rating,
    })
    .from(teamEntries)
    .innerJoin(gameEntries, eq(gameEntries.id, teamEntries.entryId))
    .innerJoin(teams, eq(teams.id, teamEntries.teamId))
    .where(eq(teams.gameId, game.id));
  const externalByTeam = new Map<string, typeof externalRows>();
  for (const row of externalRows) {
    if (!externalByTeam.has(row.teamId)) externalByTeam.set(row.teamId, []);
    externalByTeam.get(row.teamId)!.push(row);
  }

  type TeamPlayer = {
    id: string;
    name: string;
    position: string;
    fieldPosition: FieldPosition;
    fieldPositionSecondary: FieldPosition | null;
    isExternal: boolean;
    rating: number | null;
  };
  const teamMap = new Map<
    string,
    {
      id: string;
      name: string;
      queueOrder: number;
      isChampion: boolean;
      players: TeamPlayer[];
    }
  >();
  for (const row of teamRows) {
    if (!teamMap.has(row.teamId)) {
      teamMap.set(row.teamId, { id: row.teamId, name: row.teamName, queueOrder: row.queueOrder, isChampion: row.isChampion, players: [] });
    }
    if (row.playerId) {
      teamMap.get(row.teamId)!.players.push({
        id: row.playerId,
        name: row.playerName!,
        position: row.playerPosition!,
        fieldPosition: row.playerFieldPosition!,
        fieldPositionSecondary: row.playerFieldPositionSecondary,
        isExternal: false,
        rating: null,
      });
    }
  }
  for (const [teamId, rows] of externalByTeam) {
    if (!teamMap.has(teamId)) continue;
    for (const row of rows) {
      teamMap.get(teamId)!.players.push({
        id: row.entryId,
        name: row.entryName,
        position: row.entryGroup,
        fieldPosition: "meia",
        fieldPositionSecondary: null,
        isExternal: true,
        rating: Math.round(row.entryRating * 100) / 100,
      });
    }
  }
  // goleiro primeiro no time
  for (const team of teamMap.values()) {
    team.players.sort((a, b) => (a.position === "keeper" ? -1 : 0) - (b.position === "keeper" ? -1 : 0));
  }

  // ---------- goleiros: em time, na rotação ou excluídos ----------
  const { inTeams, rotation } = await goalkeeperState(game.id);

  const entryTeamByEntry = new Map<string, string>();
  const entryTeamByUser = new Map<string, string>();
  for (const [teamId, rows] of externalByTeam) {
    for (const row of rows) {
      entryTeamByEntry.set(row.entryId, teamId);
    }
  }
  for (const [userId, teamId] of inTeams) entryTeamByUser.set(userId, teamId);

  let goalkeepers: { userId: string | null; entryId: string | null; name: string; teamId: string | null }[] = [];
  let rotatingGoalkeepers: { userId: string | null; entryId: string | null; name: string }[] = [];

  if (external) {
    const entries = entriesPayload.filter((e) => e.group === "keeper");
    const assignedTeam = (e: { id: string; userId: string | null }) => entryTeamByEntry.get(e.id) ?? (e.userId ? entryTeamByUser.get(e.userId) ?? null : null);
    goalkeepers = entries.map((e) => ({
      userId: e.userId,
      entryId: e.id,
      name: e.name,
      teamId: assignedTeam(e),
    }));
    rotatingGoalkeepers = goalkeepers
      .filter((g) => !g.teamId)
      .map((g) => ({ userId: g.userId, entryId: g.entryId, name: g.name }));
  } else {
    const quotas = await getQuotaLists(game.id, pelada.listCapacity, pelada.keeperCapacity);
    const keepersInGame = quotas.keepers.titulares;
    const nameMap = new Map<string, string>();
    if (keepersInGame.length) {
      const rows = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, keepersInGame.map((c) => c.userId)));
      for (const r of rows) nameMap.set(r.id, r.name);
    }
    goalkeepers = keepersInGame.map((c) => ({
      userId: c.userId,
      entryId: null,
      name: nameMap.get(c.userId) ?? "?",
      teamId: entryTeamByUser.get(c.userId) ?? null,
    }));
    rotatingGoalkeepers = rotation.map((r) => ({
      userId: r.userId,
      entryId: null,
      name: nameMap.get(r.userId) ?? "",
    }));
  }

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
    useExternalList: pelada.useExternalList,
    listCapacity: pelada.listCapacity,
    keeperCapacity: pelada.keeperCapacity,
    line: lineGroup,
    keepers: keeperGroup,
    entries: entriesPayload,
    myPlacement,
    myConfirmation: myPlacement !== null,
    teams: [...teamMap.values()],
    // fila de rotação (quando há menos goleiros que times) — goleiros sem time fixo
    rotatingGoalkeepers,
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
    return gamePayload(game, pelada, user.id);
  })

  // confirmar presença (ordem de clique define titulares e suplentes)
  .post("/games/:id/confirm", async ({ params, user, status }) => {
    const [game] = await db.select().from(games).where(eq(games.id, params.id)).limit(1);
    if (!game) return status(404, { message: "Jogo não encontrado" });
    if (!(await isMember(game.peladaId, user.id))) return status(403, { message: "Você não é membro desta pelada" });
    const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
    if (pelada?.useExternalList) return status(400, { message: "Esta pelada usa lista externa: quem vai jogar é definido pelo manager" });
    const now = new Date();
    if (now < game.confirmOpenAt) return status(400, { message: "A confirmação ainda não abriu" });
    if (now >= game.confirmCloseAt || game.status === "drawn" || game.status === "finished") {
      return status(400, { message: "A confirmação já fechou" });
    }
    await db
      .insert(gameConfirmations)
      .values({ gameId: game.id, userId: user.id })
      .onConflictDoNothing({ target: [gameConfirmations.gameId, gameConfirmations.userId] });
    return gamePayload(game, pelada, user.id);
  })

  // desistir (antes do sorteio); suplente sobe automaticamente pela ordem
  .delete("/games/:id/confirm", async ({ params, user, status }) => {
    const [game] = await db.select().from(games).where(eq(games.id, params.id)).limit(1);
    if (!game) return status(404, { message: "Jogo não encontrado" });
    const [peladaForConfirm] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
    if (peladaForConfirm?.useExternalList) return status(400, { message: "Esta pelada usa lista externa" });
    if (game.status === "drawn" || game.status === "finished") {
      return status(400, { message: "O sorteio já foi feito" });
    }
    await db
      .delete(gameConfirmations)
      .where(and(eq(gameConfirmations.gameId, game.id), eq(gameConfirmations.userId, user.id)));
    const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
    return gamePayload(game, pelada, user.id);
  })

  // ---- modo lista externa ----

  // substitui toda a lista externa do jogo (manager/auxiliares, antes do sorteio)
  .post(
    "/games/:id/entries",
    async ({ params, body, user, status }) => {
      const [game] = await db.select().from(games).where(eq(games.id, params.id)).limit(1);
      if (!game) return status(404, { message: "Jogo não encontrado" });
      const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
      if (!pelada) return status(404, { message: "Pelada não encontrada" });
      if (!pelada.useExternalList) return status(400, { message: "Esta pelada não usa lista externa" });
      if (!(await isManagerOrAssistant(pelada.id, user.id))) {
        return status(403, { message: "Apenas o manager ou um auxiliar pode editar a lista" });
      }
      if (game.status === "drawn" || game.status === "finished") {
        return status(400, { message: "O sorteio já foi feito" });
      }

      const { line, keepers } = body;
      if (line.length === 0) return status(400, { message: "Adicione pelo menos um jogador de linha" });

      // membros precisam pertencer à pelada
      const memberUserIds = line.concat(keepers).filter((e) => e.userId).map((e) => e.userId!);
      const seen = new Set<string>();
      for (const uid of memberUserIds) {
        if (seen.has(uid)) return status(400, { message: "Jogador repetido na lista" });
        seen.add(uid);
      }
      if (memberUserIds.length > 0) {
        const members = await db
          .select({ userId: schema.peladaMembers.userId })
          .from(schema.peladaMembers)
          .where(eq(schema.peladaMembers.peladaId, pelada.id));
        const memberSet = new Set(members.map((m) => m.userId));
        for (const uid of memberUserIds) {
          if (!memberSet.has(uid)) return status(400, { message: "Um dos jogadores selecionados não é membro desta pelada" });
        }
      }
      for (const e of line.concat(keepers)) {
        if (!e.userId && !e.name?.trim()) return status(400, { message: "Jogador externo precisa de um nome" });
        if (e.rating != null && (e.rating < 1 || e.rating > 5)) {
          return status(400, { message: "A nota vai de 1 a 5" });
        }
      }

      const rows = [
        ...line.map((e, i) => ({ ...e, group: "line" as const, orderIndex: i })),
        ...keepers.map((e, i) => ({ ...e, group: "keeper" as const, orderIndex: i })),
      ];
      // snapshot do nome dos membros no momento da digitação
      const memberNameRows = memberUserIds.length
        ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, memberUserIds))
        : [];
      const memberNameMap = new Map(memberNameRows.map((m) => [m.id, m.name]));
      await db.delete(gameEntries).where(eq(gameEntries.gameId, game.id));
      await db.insert(gameEntries).values(
        rows.map((e) => ({
          gameId: game.id,
          name: e.userId ? (memberNameMap.get(e.userId) ?? "") : e.name!.trim(),
          group: e.group,
          rating: e.rating ?? 3,
          userId: e.userId ?? null,
          orderIndex: e.orderIndex,
        }))
      );
      // confirmações não fazem sentido no modo externo
      await db.delete(gameConfirmations).where(eq(gameConfirmations.gameId, game.id));

      return gamePayload(game, pelada, user.id);
    },
    { body: t.Object({ line: t.Array(entryItem), keepers: t.Array(entryItem) }) }
  )

  // sorteio manual no modo lista externa (manager/auxiliares)
  .post("/games/:id/draw", async ({ params, user, status }) => {
    const [game] = await db.select().from(games).where(eq(games.id, params.id)).limit(1);
    if (!game) return status(404, { message: "Jogo não encontrado" });
    const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
    if (!pelada) return status(404, { message: "Pelada não encontrada" });
    if (!pelada.useExternalList) return status(400, { message: "Esta pelada não usa lista externa" });
    if (!(await isManagerOrAssistant(pelada.id, user.id))) {
      return status(403, { message: "Apenas o manager ou um auxiliar pode sortear os times" });
    }
    if (game.status === "drawn" || game.status === "finished") {
      return status(400, { message: "O sorteio já foi feito" });
    }

    const entries = await getEntries(game.id);
    if (entries.filter((e) => e.group === "line").length === 0) {
      return status(400, { message: "Digite os jogadores antes de sortear" });
    }
    await performExternalDraw(game.id);
    const [refreshed] = await db.select().from(games).where(eq(games.id, game.id)).limit(1);
    return gamePayload(refreshed ?? { ...game, status: "drawn" }, pelada, user.id);
  })

  // manager consagra o time campeão do dia
  .post(
    "/games/:id/champion",
    async ({ params, body, user, status }) => {
      const [game] = await db.select().from(games).where(eq(games.id, params.id)).limit(1);
      if (!game) return status(404, { message: "Jogo não encontrado" });
      const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
      if (!(await isManagerOrAssistant(pelada.id, user.id))) return status(403, { message: "Apenas o manager ou um auxiliar pode consagrar o campeão" });
      if (game.status !== "drawn") return status(400, { message: "O sorteio ainda não aconteceu" });
      const [team] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.id, body.teamId), eq(teams.gameId, game.id)))
        .limit(1);
      if (!team) return status(404, { message: "Time não encontrado neste jogo" });
      await db.update(teams).set({ isChampion: true }).where(eq(teams.id, team.id));
      await db.update(games).set({ status: "finished" }).where(eq(games.id, game.id));
      return gamePayload({ ...game, status: "finished" }, pelada, user.id);
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
      if (!(await isManagerOrAssistant(pelada.id, user.id))) return status(403, { message: "Apenas o manager ou um auxiliar pode consagrar o campeão" });
      if (game.status !== "drawn" && game.status !== "finished") {
        return status(400, { message: "O sorteio ainda não aconteceu" });
      }
      // candidato: goleiro presente no jogo (em time ou na fila de rotação)
      const { inTeams, rotation } = await goalkeeperState(game.id);
      const keeperIds = new Set([...inTeams.keys(), ...rotation.map((r) => r.userId)]);
      if (!keeperIds.has(body.userId)) {
        return status(400, { message: "Goleiro não está neste jogo" });
      }
      // só goleiros com conta (membros) podem ser consagrados; externos não têm userId
      const [keeperUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, body.userId)).limit(1);
      if (!keeperUser) return status(400, { message: "Goleiro não está neste jogo" });
      await db.update(games).set({ championGoalkeeperId: body.userId }).where(eq(games.id, game.id));
      return gamePayload({ ...game, championGoalkeeperId: body.userId }, pelada, user.id);
    },
    { body: t.Object({ userId: t.String() }) }
  );
