import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { averageRatings } from "./ratings";
import { notify } from "./notify";

const { games, gameConfirmations, teams, teamPlayers, peladas, users, gameEntries, teamEntries } = schema;

export interface Titular {
  userId: string;
  confirmedAt: Date;
  position: "line" | "keeper";
}

/** Entrada da lista externa de um jogo. */
export interface ExternalEntry {
  id: string;
  name: string;
  group: "line" | "keeper";
  rating: number;
  userId: string | null;
}

/** Confirmados do jogo (ordem de confirmação) com a posição de cada um. */
export async function getConfirmations(gameId: string) {
  return db
    .select({
      userId: gameConfirmations.userId,
      confirmedAt: gameConfirmations.confirmedAt,
      position: users.position,
    })
    .from(gameConfirmations)
    .innerJoin(users, eq(users.id, gameConfirmations.userId))
    .where(eq(gameConfirmations.gameId, gameId))
    .orderBy(asc(gameConfirmations.confirmedAt));
}

/**
 * Cotas independentes por posição:
 * - titulares de linha: primeiros `lineCapacity` na ordem de clique
 * - titulares de goleiro: primeiros `keeperCapacity` na ordem de clique
 * - excedentes de cada posição viram filas de suplentes separadas
 */
export async function getQuotaLists(gameId: string, lineCapacity: number, keeperCapacity: number) {
  const confirmations = await getConfirmations(gameId);
  const lines = confirmations.filter((c) => c.position === "line");
  const keepers = confirmations.filter((c) => c.position === "keeper");
  return {
    line: { titulares: lines.slice(0, lineCapacity), suplentes: lines.slice(lineCapacity) },
    keepers: { titulares: keepers.slice(0, keeperCapacity), suplentes: keepers.slice(keeperCapacity) },
  };
}

/** Entradas da lista externa de um jogo, na ordem digitada. */
export async function getEntries(gameId: string): Promise<ExternalEntry[]> {
  return db
    .select({
      id: gameEntries.id,
      name: gameEntries.name,
      group: gameEntries.group,
      rating: gameEntries.rating,
      userId: gameEntries.userId,
    })
    .from(gameEntries)
    .where(eq(gameEntries.gameId, gameId))
    .orderBy(asc(gameEntries.orderIndex), asc(gameEntries.createdAt));
}

/**
 * Estado dos goleiros de um jogo sorteado:
 * - inTeams: goleiro -> teamId (1 por time, quando há goleiros suficientes)
 * - rotation: fila de rotação (ordem de confirmação) quando há MENOS goleiros que times
 * - excluded: goleiros excedentes (ficam de fora) quando há MAIS goleiros que times
 *
 * Determinístico: pode ser recalculado a partir do sorteio gravado.
 */
export async function goalkeeperState(gameId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) return { inTeams: new Map<string, string>(), rotation: [] as Titular[], excluded: [] as Titular[] };
  const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
  if (!pelada) return { inTeams: new Map<string, string>(), rotation: [] as Titular[], excluded: [] as Titular[] };

  if (pelada.useExternalList) {
    return goalkeeperStateExternal(gameId, pelada.playersPerTeam);
  }

  const quotas = await getQuotaLists(gameId, pelada.listCapacity, pelada.keeperCapacity);
  const titulares = [...quotas.line.titulares, ...quotas.keepers.titulares];
  const keepers = titulares.filter((t) => t.position === "keeper");
  const lines = titulares.filter((t) => t.position === "line");
  const k = Math.max(1, Math.ceil(lines.length / pelada.playersPerTeam));

  const rows = await db
    .select({ teamId: teamPlayers.teamId, userId: teamPlayers.userId })
    .from(teamPlayers)
    .innerJoin(teams, eq(teams.id, teamPlayers.teamId))
    .where(eq(teams.gameId, gameId));

  const inTeams = new Map<string, string>();
  for (const row of rows) {
    if (keepers.some((kp) => kp.userId === row.userId)) inTeams.set(row.userId, row.teamId);
  }

  const rotation: Titular[] = [];
  const excluded: Titular[] = [];
  if (keepers.length >= k) {
    // todos os times têm goleiro; quem não está em time é excedente
    for (const kp of keepers) if (!inTeams.has(kp.userId)) excluded.push(kp);
  } else {
    // menos goleiros que times: quem não está em time entra na rotação (ordem de confirmação)
    for (const kp of keepers) if (!inTeams.has(kp.userId)) rotation.push(kp);
  }

  return { inTeams, rotation, excluded };
}

/**
 * Sorteio balanceado:
 * 1. Titulares separados em linha e goleiros.
 * 2. Linha: zigue-zague pela média de bolas nos times de N.
 * 3. Goleiros >= times: 1 por time, zigue-zague invertido (melhor goleiro -> time de linha mais fraco).
 * 4. Goleiros < times: fila de rotação (ordem de confirmação); times sem goleiro.
 * 5. Goleiros > times: excedentes ficam de fora.
 */
export async function performDraw(gameId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game || game.status === "drawn" || game.status === "finished") return;
  const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
  if (!pelada) return;

  const quotas = await getQuotaLists(gameId, pelada.listCapacity, pelada.keeperCapacity);
  const titulares = [...quotas.line.titulares, ...quotas.keepers.titulares];
  const keepers = titulares.filter((t) => t.position === "keeper");
  const lines = titulares.filter((t) => t.position === "line");

  const averages = await averageRatings(pelada.id);
  const byAvg = (a: Titular, b: Titular) => {
    const diff = (averages.get(b.userId) ?? 3) - (averages.get(a.userId) ?? 3);
    if (diff !== 0) return diff;
    return a.confirmedAt.getTime() - b.confirmedAt.getTime();
  };

  const k = Math.max(1, Math.ceil(lines.length / pelada.playersPerTeam));

  if (titulares.length > 0) {
    // 1. zigue-zague dos jogadores de linha
    const sortedLines = [...lines].sort(byAvg);
    const buckets: string[][] = Array.from({ length: k }, () => []);
    sortedLines.forEach((p, i) => {
      const round = Math.floor(i / k);
      const pos = i % k;
      const teamIdx = round % 2 === 0 ? pos : k - 1 - pos;
      buckets[teamIdx].push(p.userId);
    });

    // 2. goleiros: 1 por time quando suficientes; melhor goleiro -> time de linha mais fraco
    const keeperByTeam = new Map<number, string>(); // teamIdx -> keeperId
    if (keepers.length >= k) {
      const sortedKeepers = [...keepers].sort(byAvg);
      const teamsByLineStrength = buckets
        .map((members, idx) => {
          const avg = members.length
            ? members.reduce((acc, id) => acc + (averages.get(id) ?? 3), 0) / members.length
            : 0;
          return { idx, avg };
        })
        .sort((a, b) => b.avg - a.avg); // mais forte primeiro
      for (let i = 0; i < k; i++) {
        keeperByTeam.set(teamsByLineStrength[k - 1 - i].idx, sortedKeepers[i].userId); // melhor goleiro -> mais fraco
      }
    }

    // 3. grava times
    for (let i = 0; i < k; i++) {
      const [team] = await db
        .insert(teams)
        .values({ gameId, name: `Time ${i + 1}`, queueOrder: i + 1 })
        .returning();
      const members = [...(keeperByTeam.get(i) ? [keeperByTeam.get(i)!] : []), ...buckets[i]];
      if (members.length > 0) {
        await db.insert(teamPlayers).values(members.map((userId) => ({ teamId: team.id, userId })));
      }
    }

    await notify(
      titulares.map((t) => t.userId),
      "teams_drawn",
      { peladaId: pelada.id, peladaName: pelada.name, gameId }
    );
  }

  await db.update(games).set({ status: "drawn" }).where(eq(games.id, gameId));
}

/** Versão do goalkeeperState para o modo lista externa (goleiros vêm das entries). */
async function goalkeeperStateExternal(gameId: string, playersPerTeam: number) {
  const entries = await getEntries(gameId);
  const keepers = entries.filter((e) => e.group === "keeper");
  const lines = entries.filter((e) => e.group === "line");
  const k = Math.max(1, Math.ceil(Math.max(lines.length, 1) / playersPerTeam));

  // membros alocados via teamPlayers; externos via teamEntries
  const memberRows = await db
    .select({ teamId: teamPlayers.teamId, userId: teamPlayers.userId })
    .from(teamPlayers)
    .innerJoin(teams, eq(teams.id, teamPlayers.teamId))
    .where(eq(teams.gameId, gameId));
  const externalRows = await db
    .select({ teamId: teamEntries.teamId, entryId: gameEntries.id, userId: gameEntries.userId })
    .from(teamEntries)
    .innerJoin(gameEntries, eq(gameEntries.id, teamEntries.entryId))
    .innerJoin(teams, eq(teams.id, teamEntries.teamId))
    .where(eq(teams.gameId, gameId));

  const inTeams = new Map<string, string>();
  for (const row of memberRows) {
    if (keepers.some((kp) => kp.userId === row.userId)) inTeams.set(row.userId, row.teamId);
  }
  for (const row of externalRows) {
    if (row.userId) inTeams.set(row.userId, row.teamId);
  }

  const rotation: Titular[] = [];
  const excluded: Titular[] = [];
  const now = new Date();
  if (keepers.length >= k) {
    for (const kp of keepers) {
      const userId = kp.userId;
      if (!userId || !inTeams.has(userId)) excluded.push({ userId: userId ?? kp.id, confirmedAt: now, position: "keeper" });
    }
  } else {
    for (const kp of keepers) {
      const userId = kp.userId;
      if (!userId || !inTeams.has(userId)) rotation.push({ userId: userId ?? kp.id, confirmedAt: now, position: "keeper" });
    }
  }

  return { inTeams, rotation, excluded };
}

/**
 * Sorteio no modo lista externa: mesma estratégia de balanceamento do performDraw
 * (zigue-zague por nota + goleiros), mas as notas vêm das entries:
 * - membro (userId preenchido): média de bolas da pelada
 * - externo: nota digitada pelo admin (não é salva no sistema)
 */
export async function performExternalDraw(gameId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game || game.status === "drawn" || game.status === "finished") return;
  const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
  if (!pelada || !pelada.useExternalList) return;

  const entries = await getEntries(gameId);
  const keepers = entries.filter((e) => e.group === "keeper");
  const lines = entries.filter((e) => e.group === "line");
  if (lines.length === 0) return;

  const averages = await averageRatings(pelada.id);
  // nota efetiva: média do membro quando cadastrado; nota digitada para externos
  const ratingOf = (e: ExternalEntry) => (e.userId ? (averages.get(e.userId) ?? e.rating) : e.rating);
  const byRating = (a: ExternalEntry, b: ExternalEntry) => {
    const diff = ratingOf(b) - ratingOf(a);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  };

  const k = Math.max(1, Math.ceil(lines.length / pelada.playersPerTeam));

  // 1. zigue-zague dos jogadores de linha
  const sortedLines = [...lines].sort(byRating);
  const buckets: ExternalEntry[][] = Array.from({ length: k }, () => []);
  sortedLines.forEach((p, i) => {
    const round = Math.floor(i / k);
    const pos = i % k;
    const teamIdx = round % 2 === 0 ? pos : k - 1 - pos;
    buckets[teamIdx].push(p);
  });

  // 2. goleiros: 1 por time quando suficientes; melhor goleiro -> time de linha mais fraco
  const keeperByTeam = new Map<number, ExternalEntry>();
  if (keepers.length >= k) {
    const sortedKeepers = [...keepers].sort(byRating);
    const teamsByLineStrength = buckets
      .map((members, idx) => {
        const avg = members.length ? members.reduce((acc, e) => acc + ratingOf(e), 0) / members.length : 0;
        return { idx, avg };
      })
      .sort((a, b) => b.avg - a.avg);
    for (let i = 0; i < k; i++) {
      keeperByTeam.set(teamsByLineStrength[k - 1 - i].idx, sortedKeepers[i]);
    }
  }

  // 3. grava times: membros em teamPlayers, externos em teamEntries
  for (let i = 0; i < k; i++) {
    const [team] = await db
      .insert(teams)
      .values({ gameId, name: `Time ${i + 1}`, queueOrder: i + 1 })
      .returning();
    const keeperEntry = keeperByTeam.get(i);
    const members = keeperEntry ? [keeperEntry, ...buckets[i]] : buckets[i];
    for (const e of members) {
      if (e.userId) {
        await db.insert(teamPlayers).values({ teamId: team.id, userId: e.userId }).onConflictDoNothing();
      } else {
        await db.insert(teamEntries).values({ teamId: team.id, entryId: e.id }).onConflictDoNothing();
      }
    }
  }

  // 4. notifica todos os membros da pelada (a lista é digitada, não há ordem de clique)
  const { memberIds } = await import("./guards");
  await notify(await memberIds(pelada.id), "teams_drawn", {
    peladaId: pelada.id,
    peladaName: pelada.name,
    gameId,
  });

  await db.update(games).set({ status: "drawn" }).where(eq(games.id, gameId));
}

/** Garante que exista o jogo da rodada atual da pelada. Retorna o jogo. */
export async function ensureCurrentGame(pelada: typeof peladas.$inferSelect, now = new Date()) {
  const { nextGameWindow } = await import("./time");
  const window = nextGameWindow(pelada, now);
  // gameAt é determinístico (minutos zerados), então igualdade exata funciona
  const [found] = await db
    .select()
    .from(games)
    .where(and(eq(games.peladaId, pelada.id), eq(games.gameAt, window.gameAt)))
    .limit(1);
  if (found) return found;
  const [created] = await db
    .insert(games)
    .values({
      peladaId: pelada.id,
      gameAt: window.gameAt,
      confirmOpenAt: window.confirmOpenAt,
      confirmCloseAt: window.confirmCloseAt,
      status: "scheduled",
    })
    .returning();
  return created;
}

/** Avança o ciclo de vida dos jogos: abre confirmação e fecha com sorteio. */
export async function tickGames(now = new Date()) {
  const allPeladas = await db.select().from(peladas);
  for (const pelada of allPeladas) {
    await ensureCurrentGame(pelada, now);
  }

  const candidates = await db
    .select()
    .from(games)
    .where(inArray(games.status, ["scheduled", "open"]));

  for (const game of candidates) {
    const [pelada] = await db.select().from(peladas).where(eq(peladas.id, game.peladaId)).limit(1);
    // modo lista externa: nada é automático — admin digita a lista e sorteia manualmente
    if (pelada?.useExternalList) continue;
    if (now >= game.confirmCloseAt) {
      await performDraw(game.id);
    } else if (now >= game.confirmOpenAt && game.status === "scheduled") {
      await db.update(games).set({ status: "open" }).where(eq(games.id, game.id));
      if (pelada) {
        const { memberIds } = await import("./guards");
        await notify(await memberIds(pelada.id), "game_open", {
          peladaId: pelada.id,
          peladaName: pelada.name,
          gameId: game.id,
        });
      }
    }
  }
}
