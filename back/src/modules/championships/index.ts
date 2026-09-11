import { Elysia, t } from "elysia";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db, executeRaw, schema } from "../../db";
import { authed } from "../auth";
import { getPelada, isManagerOrAssistant, isMember, memberIds } from "../../lib/guards";
import { notify } from "../../lib/notify";
import { averageRatings } from "../../lib/ratings";

const {
  users,
  ratings,
  ratingRequests,
  championships,
  championshipOptIns,
  championshipTeams,
  championshipPlayers,
  championshipPicks,
  championshipMatches,
  championshipMatchEvents,
} = schema;

type Championship = typeof championships.$inferSelect;

const CHAMP_ACTIVE = ["config", "drafting", "groups", "knockout"] as const;

function isPowerOfTwo(n: number) {
  return n >= 2 && (n & (n - 1)) === 0;
}

async function getChampionship(id: string) {
  const [champ] = await db.select().from(championships).where(eq(championships.id, id)).limit(1);
  return champ ?? null;
}

/**
 * Level de cada membro conforme a base escolhida nas configurações:
 * - "pelada": média de bolas de todos os avaliadores (averageRatings)
 * - "captains": média das bolas dadas pelos capitães do campeonato;
 *   sem nota de capitão, cai para a média da pelada.
 */
async function levelMap(champ: Championship): Promise<Map<string, number>> {
  const peladaAvg = await averageRatings(champ.peladaId);
  if (champ.levelBasis === "pelada") return peladaAvg;
  const captains = await db
    .select({ captainUserId: championshipTeams.captainUserId })
    .from(championshipTeams)
    .where(eq(championshipTeams.championshipId, champ.id));
  const captainIds = captains.map((c) => c.captainUserId);
  if (captainIds.length === 0) return peladaAvg;
  const rows = await db
    .select({ rateeId: ratings.rateeId, avg: sql<number>`avg(${ratings.stars})::float` })
    .from(ratings)
    .where(and(eq(ratings.peladaId, champ.peladaId), inArray(ratings.raterId, captainIds), ne(ratings.raterId, ratings.rateeId)))
    .groupBy(ratings.rateeId);
  const captainAvg = new Map(rows.map((r) => [r.rateeId, Number(r.avg)]));
  const map = new Map<string, number>();
  for (const [userId, avg] of peladaAvg) map.set(userId, captainAvg.get(userId) ?? avg);
  return map;
}

/** Rodada do draft (0-based) → ordem dos times, respeitando serpentina. */
function roundOrder(baseOrder: string[], snake: boolean, round: number): string[] {
  if (snake && round % 2 === 1) return [...baseOrder].reverse();
  return baseOrder;
}

/** Todos contra todos (método do círculo); time ímpar folga em cada rodada. */
function roundRobinPairs(n: number): [number, number][][] {
  const ids = Array.from({ length: n }, (_, i) => i);
  if (ids.length % 2 !== 0) ids.push(-1);
  const m = ids.length;
  const rounds: [number, number][][] = [];
  for (let r = 0; r < m - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < m / 2; i++) {
      const a = ids[i];
      const b = ids[m - 1 - i];
      if (a !== -1 && b !== -1) pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }
  return rounds;
}

/** Classificação da fase de grupos: pts → saldo → gols pró → confronto direto → nome. */
function computeStandings(teamRows: { id: string; name: string }[], groupMatches: (typeof championshipMatches.$inferSelect)[]) {
  type Row = {
    teamId: string;
    teamName: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalsDiff: number;
    points: number;
  };
  const map = new Map<string, Row>();
  for (const t of teamRows) {
    map.set(t.id, { teamId: t.id, teamName: t.name, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalsDiff: 0, points: 0 });
  }
  const finished = groupMatches.filter((m) => m.homeScore !== null && m.awayScore !== null);
  for (const m of finished) {
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.goalsFor += m.homeScore!;
    home.goalsAgainst += m.awayScore!;
    away.goalsFor += m.awayScore!;
    away.goalsAgainst += m.homeScore!;
    if (m.homeScore! > m.awayScore!) {
      home.wins++;
      away.losses++;
      home.points += 3;
    } else if (m.homeScore! < m.awayScore!) {
      away.wins++;
      home.losses++;
      away.points += 3;
    } else {
      home.draws++;
      away.draws++;
      home.points += 1;
      away.points += 1;
    }
  }
  for (const row of map.values()) row.goalsDiff = row.goalsFor - row.goalsAgainst;
  const key = (r: Row) => `${r.points}|${r.goalsDiff}|${r.goalsFor}`;
  const sorted = [...map.values()].sort(
    (a, b) => b.points - a.points || b.goalsDiff - a.goalsDiff || b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName)
  );
  // desempate final por confronto direto quando o empate é entre exatamente 2 times
  const result = [...sorted];
  for (let i = 0; i < result.length - 1; i++) {
    const a = result[i];
    const b = result[i + 1];
    if (key(a) !== key(b)) continue;
    // procura o fim do bloco empatado
    let j = i + 1;
    while (j + 1 < result.length && key(result[j + 1]) === key(a)) j++;
    if (j - i !== 1) continue; // só aplica para empate duplo
    const direct = finished.filter(
      (m) => (m.homeTeamId === a.teamId && m.awayTeamId === b.teamId) || (m.homeTeamId === b.teamId && m.awayTeamId === a.teamId)
    );
    let aPts = 0;
    let bPts = 0;
    for (const m of direct) {
      if (m.homeScore === null || m.awayScore === null) continue;
      const homePts = m.homeScore! > m.awayScore! ? 3 : m.homeScore! < m.awayScore! ? 0 : 1;
      const awayPts = m.homeScore! < m.awayScore! ? 3 : m.homeScore! > m.awayScore! ? 0 : 1;
      if (m.homeTeamId === a.teamId) {
        aPts += homePts;
        bPts += awayPts;
      } else {
        aPts += awayPts;
        bPts += homePts;
      }
    }
    if (bPts > aPts) [result[i], result[i + 1]] = [result[i + 1], result[i]];
    i = j;
  }
  return result;
}

/** Líderes por tipo de evento (artilharia, assistências, cartões, melhor do jogo). */
async function championshipLeaders(championshipId: string) {
  const rows = await executeRaw<{ type: string; user_id: string; name: string; total: number }>(sql`
    SELECT e.type, u.id AS user_id, u.name, COUNT(*)::int AS total
    FROM championship_match_events e
    JOIN championship_matches m ON m.id = e.match_id AND m.championship_id = ${championshipId}
    JOIN users u ON u.id = e.user_id
    GROUP BY e.type, u.id, u.name
    ORDER BY total DESC, u.name ASC
  `);
  const byType = new Map<string, { userId: string; name: string; count: number }[]>();
  for (const r of rows) {
    const list = byType.get(r.type) ?? [];
    list.push({ userId: r.user_id, name: r.name, count: Number(r.total) });
    byType.set(r.type, list);
  }
  const top = (type: string) => (byType.get(type) ?? []).slice(0, 10);
  return { goals: top("goal"), assists: top("assist"), yellow: top("yellow"), red: top("red"), motm: top("motm") };
}

/** Time campeão: vencedor da última rodada do mata-mata (apenas em campeonato finalizado). */
async function championOf(championshipId: string) {
  const rows = await db
    .select({
      round: championshipMatches.round,
      winnerTeamId: championshipMatches.winnerTeamId,
      teamName: championshipTeams.name,
      captainUserId: championshipTeams.captainUserId,
      captainName: users.name,
    })
    .from(championshipMatches)
    .innerJoin(championshipTeams, eq(championshipTeams.id, championshipMatches.winnerTeamId))
    .innerJoin(users, eq(users.id, championshipTeams.captainUserId))
    .where(and(eq(championshipMatches.championshipId, championshipId), eq(championshipMatches.stage, "knockout")))
    .orderBy(desc(championshipMatches.round));
  if (rows.length === 0) return null;
  const maxRound = Math.max(...rows.map((r) => r.round));
  const final = rows.find((r) => r.round === maxRound && r.winnerTeamId);
  if (!final?.winnerTeamId) return null;
  return {
    teamId: final.winnerTeamId,
    teamName: final.teamName,
    captain: { id: final.captainUserId, name: final.captainName },
  };
}

/** Avança o mata-mata: gera próxima fase a partir dos vencedores ou coroa o campeão. */
async function advanceKnockout(champ: Championship) {
  const matches = await db
    .select()
    .from(championshipMatches)
    .where(and(eq(championshipMatches.championshipId, champ.id), eq(championshipMatches.stage, "knockout")));

  if (matches.length === 0) {
    const groupMatches = await db
      .select()
      .from(championshipMatches)
      .where(and(eq(championshipMatches.championshipId, champ.id), eq(championshipMatches.stage, "group")));
    if (groupMatches.length === 0) return false;
    const groupRounds = new Set(groupMatches.map((m) => m.round));
    const maxRound = Math.max(...groupRounds);
    // todas as rodadas de grupos precisam estar completas
    for (let r = 1; r <= maxRound; r++) {
      const roundMatches = groupMatches.filter((m) => m.round === r);
      if (roundMatches.length === 0 || roundMatches.some((m) => m.homeScore === null || m.awayScore === null)) return false;
    }
    const teamRows = await db
      .select({ id: championshipTeams.id, name: championshipTeams.name })
      .from(championshipTeams)
      .where(eq(championshipTeams.championshipId, champ.id))
      .orderBy(asc(championshipTeams.orderIndex));
    const standings = computeStandings(teamRows, groupMatches);
    const qualified = standings.slice(0, champ.qualifiersCount);
    if (qualified.length < 2) return false;
    const pairs: [string, string][] = [];
    const q = qualified.length;
    for (let i = 0; i < q / 2; i++) pairs.push([qualified[i].teamId, qualified[q - 1 - i].teamId]);
    await db.insert(championshipMatches).values(
      pairs.map(([home, away], i) => ({
        championshipId: champ.id,
        stage: "knockout" as const,
        round: 1,
        slot: i,
        homeTeamId: home,
        awayTeamId: away,
      }))
    );
    await db.update(championships).set({ status: "knockout" }).where(eq(championships.id, champ.id));
    return false;
  }

  const round = Math.max(...matches.map((m) => m.round));
  const roundMatches = matches.filter((m) => m.round === round);
  if (roundMatches.some((m) => m.homeScore === null || m.awayScore === null)) return false;
  const winners = roundMatches.sort((a, b) => a.slot - b.slot).map((m) => m.winnerTeamId!);

  if (roundMatches.length === 1) {
    const [team] = await db
      .select({ id: championshipTeams.id, name: championshipTeams.name, captainUserId: championshipTeams.captainUserId })
      .from(championshipTeams)
      .where(eq(championshipTeams.id, winners[0]))
      .limit(1);
    await db.update(championships).set({ status: "finished", finishedAt: new Date() }).where(eq(championships.id, champ.id));
    const memberList = await memberIds(champ.peladaId);
    await notify(memberList, "championship_champion", {
      peladaId: champ.peladaId,
      championshipId: champ.id,
      championshipName: champ.name,
      championTeamName: team?.name ?? "",
    });
    return true;
  }

  const pairs: [string, string][] = [];
  for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1]]);
  await db.insert(championshipMatches).values(
    pairs.map(([home, away], i) => ({
      championshipId: champ.id,
      stage: "knockout" as const,
      round: round + 1,
      slot: i,
      homeTeamId: home,
      awayTeamId: away,
    }))
  );
  return false;
}

/** Payload completo do campeonato para a UI. */
async function championshipPayload(champ: Championship, viewerId: string) {
  const pelada = await getPelada(champ.peladaId);

  const teamRows = await db
    .select()
    .from(championshipTeams)
    .where(eq(championshipTeams.championshipId, champ.id))
    .orderBy(asc(championshipTeams.orderIndex));

  const playerRows = await db
    .select({
      teamId: championshipPlayers.teamId,
      userId: championshipPlayers.userId,
      name: users.name,
      position: users.position,
    })
    .from(championshipPlayers)
    .innerJoin(users, eq(users.id, championshipPlayers.userId))
    .innerJoin(championshipTeams, eq(championshipTeams.id, championshipPlayers.teamId))
    .where(eq(championshipTeams.championshipId, champ.id));

  const optInRows = await db
    .select({ userId: championshipOptIns.userId, createdAt: championshipOptIns.createdAt })
    .from(championshipOptIns)
    .where(eq(championshipOptIns.championshipId, champ.id));

  const pickRows = await db
    .select()
    .from(championshipPicks)
    .where(eq(championshipPicks.championshipId, champ.id))
    .orderBy(asc(championshipPicks.overall));

  const matchRows = await db
    .select()
    .from(championshipMatches)
    .where(eq(championshipMatches.championshipId, champ.id))
    .orderBy(asc(championshipMatches.round), asc(championshipMatches.slot));

  const eventRows = matchRows.length
    ? await db
        .select({
          matchId: championshipMatchEvents.matchId,
          userId: championshipMatchEvents.userId,
          type: championshipMatchEvents.type,
          name: users.name,
        })
        .from(championshipMatchEvents)
        .innerJoin(users, eq(users.id, championshipMatchEvents.userId))
        .where(
          inArray(
            championshipMatchEvents.matchId,
            matchRows.map((m) => m.id)
          )
        )
    : [];

  // nomes dos capitães e de quem fez cada pick
  const extraIds = [...pickRows.map((p) => p.pickedByUserId), ...teamRows.map((t) => t.captainUserId)];
  const nameRows = extraIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, extraIds))
    : [];
  const nameById = new Map(nameRows.map((u) => [u.id, u.name]));

  const pickedUserIds = new Set(playerRows.map((p) => p.userId));
  const levels = await levelMap(champ);

  const members = pelada ? await memberIds(champ.peladaId) : [];
  const memberNameRows = members.length
    ? await db.select({ id: users.id, name: users.name, position: users.position }).from(users).where(inArray(users.id, members))
    : [];
  const memberById = new Map(memberNameRows.map((u) => [u.id, u]));

  const optInIds = new Set(optInRows.map((o) => o.userId));
  const pool = memberNameRows
    .filter((m) => optInIds.has(m.id))
    .map((m) => ({
      userId: m.id,
      name: m.name,
      position: m.position,
      level: Math.round((levels.get(m.id) ?? 3) * 10) / 10,
      picked: pickedUserIds.has(m.id),
    }))
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

  const teamsPayload = teamRows.map((t) => ({
    id: t.id,
    name: t.name,
    orderIndex: t.orderIndex,
    captain: { id: t.captainUserId, name: nameById.get(t.captainUserId) ?? "?" },
    players: playerRows
      .filter((p) => p.teamId === t.id)
      .map((p) => ({ userId: p.userId, name: p.name, position: p.position }))
      .sort((a, b) => (a.position === "keeper" ? -1 : 0) - (b.position === "keeper" ? -1 : 0)),
  }));

  const n = teamRows.length;
  const baseOrder = teamRows.map((t) => t.id);
  const overall = pickRows.length;
  const draftRound = Math.floor(overall / n);
  const slot = overall % n;
  const order = roundOrder(baseOrder, champ.snakeDraft, draftRound);
  const currentTeamId = order[slot] ?? null;
  const currentTeam = currentTeamId ? teamRows.find((t) => t.id === currentTeamId) ?? null : null;

  const groupMatches = matchRows.filter((m) => m.stage === "group");
  const standings = computeStandings(teamRows, groupMatches);

  const [leaderMap, canManage] = await Promise.all([
    championshipLeaders(champ.id),
    pelada ? isManagerOrAssistant(champ.peladaId, viewerId) : Promise.resolve(false),
  ]);

  const champion = champ.status === "finished" ? await championOf(champ.id) : null;

  return {
    id: champ.id,
    peladaId: champ.peladaId,
    name: champ.name,
    mode: champ.mode,
    status: champ.status,
    levelBasis: champ.levelBasis,
    snakeDraft: champ.snakeDraft,
    qualifiersCount: champ.qualifiersCount,
    teamCount: n,
    createdAt: champ.createdAt,
    finishedAt: champ.finishedAt,
    cancelledAt: champ.cancelledAt,
    myOptIn: optInIds.has(viewerId),
    viewer: { canManage, captainOfTeamId: myTeamCaptainOf(viewerId, teamRows) },
    teams: teamsPayload,
    pool,
    draft: {
      snake: champ.snakeDraft,
      baseOrder,
      picks: pickRows.map((p) => ({
        overall: p.overall,
        round: p.round,
        slot: p.slot,
        teamId: p.teamId,
        userId: p.userId,
        playerName: memberById.get(p.userId)?.name ?? "?",
        pickedByUserId: p.pickedByUserId,
        pickedByName: nameById.get(p.pickedByUserId) ?? "?",
      })),
      current:
        champ.status === "drafting" && currentTeam
          ? {
              round: draftRound + 1,
              slot: slot + 1,
              teamId: currentTeam.id,
              teamName: currentTeam.name,
              captainUserId: currentTeam.captainUserId,
            }
          : null,
    },
    matches: matchRows.map((m) => ({
      id: m.id,
      stage: m.stage,
      round: m.round,
      slot: m.slot,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeTeamName: teamsPayload.find((t) => t.id === m.homeTeamId)?.name ?? "?",
      awayTeamName: teamsPayload.find((t) => t.id === m.awayTeamId)?.name ?? "?",
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homePenalties: m.homePenalties,
      awayPenalties: m.awayPenalties,
      winnerTeamId: m.winnerTeamId,
      events: eventRows
        .filter((e) => e.matchId === m.id)
        .map((e) => ({ userId: e.userId, playerName: e.name, type: e.type })),
    })),
    standings,
    leaders: leaderMap,
    champion,
  };
}

function myTeamCaptainOf(userId: string, teamRows: (typeof championshipTeams.$inferSelect)[]) {
  return teamRows.find((t) => t.captainUserId === userId)?.id ?? null;
}

/** Valida e devolve erro (ou null) para a configuração de um campeonato. */
async function validateConfig(
  peladaId: string,
  body: { teamCount: number; captainIds: string[]; qualifiersCount: number }
) {
  const { captainIds } = body;
  if (new Set(captainIds).size !== captainIds.length) return { error: "Cada capitão só pode comandar um time" };
  const memberList = new Set(await memberIds(peladaId));
  const missing = captainIds.find((id) => !memberList.has(id));
  if (missing) return { error: "Todos os capitães precisam ser membros da pelada" };
  if (captainIds.length !== body.teamCount) return { error: "A quantidade de capitães deve ser igual à quantidade de times" };
  if (!isPowerOfTwo(body.qualifiersCount) || body.qualifiersCount < 2 || body.qualifiersCount >= body.teamCount) {
    return { error: "Classificados deve ser potência de 2 (2, 4, 8…) e menor que o total de times" };
  }
  return { error: null as string | null };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

async function teamCaptainIds(championshipId: string): Promise<string[]> {
  const rows = await db
    .select({ captainUserId: championshipTeams.captainUserId })
    .from(championshipTeams)
    .where(eq(championshipTeams.championshipId, championshipId))
    .orderBy(asc(championshipTeams.orderIndex));
  return rows.map((r) => r.captainUserId);
}

export const championshipsModule = new Elysia()
  .use(authed)

  // lista o campeonato ativo + histórico de campeões da pelada
  .get("/peladas/:id/championships", async ({ params, user, status }) => {
    const pelada = await getPelada(params.id);
    if (!pelada) return status(404, { message: "Pelada não encontrada" });
    if (!(await isMember(pelada.id, user.id))) return status(403, { message: "Você não é membro desta pelada" });

    const rows = await db
      .select()
      .from(championships)
      .where(eq(championships.peladaId, pelada.id))
      .orderBy(desc(championships.createdAt));
    const active = rows.find((c) => (CHAMP_ACTIVE as readonly string[]).includes(c.status)) ?? null;
    const past = rows.filter((c) => c.status === "finished" || c.status === "cancelled");

    const championTeams =
      past.length > 0
        ? await db
            .select({
              championshipId: championshipMatches.championshipId,
              round: championshipMatches.round,
              winnerTeamId: championshipMatches.winnerTeamId,
              teamName: championshipTeams.name,
              captainUserId: championshipTeams.captainUserId,
              captainName: users.name,
            })
            .from(championshipMatches)
            .innerJoin(championshipTeams, eq(championshipTeams.id, championshipMatches.winnerTeamId))
            .innerJoin(users, eq(users.id, championshipTeams.captainUserId))
            .where(
              and(
                eq(championshipMatches.stage, "knockout"),
                inArray(
                  championshipMatches.championshipId,
                  past.map((c) => c.id)
                )
              )
            )
        : [];
    const championByChamp = new Map<string, (typeof championTeams)[number]>();
    for (const row of championTeams) {
      const current = championByChamp.get(row.championshipId);
      if (!current || row.round > current.round) championByChamp.set(row.championshipId, row);
    }

    return {
      championship: active ? await championshipPayload(active, user.id) : null,
      history: past.map((c) => {
        const champion = championByChamp.get(c.id);
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          finishedAt: c.finishedAt,
          cancelledAt: c.cancelledAt,
          championTeamName: champion?.teamName ?? null,
          championCaptainName: champion?.captainName ?? null,
        };
      }),
    };
  })

  // cria o campeonato (apenas manager/auxiliares) — só o modo draft está aberto
  .post(
    "/peladas/:id/championship",
    async ({ params, body, user, status }) => {
      const pelada = await getPelada(params.id);
      if (!pelada) return status(404, { message: "Pelada não encontrada" });
      if (!(await isManagerOrAssistant(pelada.id, user.id))) {
        return status(403, { message: "Apenas o manager ou um auxiliar pode criar o campeonato" });
      }
      if (body.mode === "sorteio") return status(400, { message: "O modo sorteio estará disponível em breve" });

      const existing = await db
        .select({ id: championships.id })
        .from(championships)
        .where(and(eq(championships.peladaId, pelada.id), inArray(championships.status, [...CHAMP_ACTIVE])))
        .limit(1);
      if (existing.length > 0) return status(409, { message: "Já existe um campeonato ativo nesta pelada" });

      const configError = await validateConfig(pelada.id, body);
      if (configError?.error) return status(400, { message: configError.error });

      const [champ] = await db
        .insert(championships)
        .values({
          peladaId: pelada.id,
          name: body.name.trim(),
          mode: "draft",
          levelBasis: body.levelBasis,
          snakeDraft: body.snakeDraft,
          qualifiersCount: body.qualifiersCount,
        })
        .returning();

      // ordem base: pior level escolhe primeiro
      const levels = await levelMap(champ);
      const captains = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, body.captainIds));
      const nameById = new Map(captains.map((c) => [c.id, c.name]));
      const orderedIds = [...body.captainIds].sort((a, b) => (levels.get(a) ?? 3) - (levels.get(b) ?? 3));
      await db.insert(championshipTeams).values(
        orderedIds.map((captainUserId, i) => ({
          championshipId: champ.id,
          captainUserId,
          name: `Time ${firstName(nameById.get(captainUserId) ?? "")}`,
          orderIndex: i + 1,
        }))
      );

      const memberList = await memberIds(pelada.id);
      await notify(memberList, "championship_created", {
        peladaId: pelada.id,
        championshipId: champ.id,
        championshipName: champ.name,
        peladaName: pelada.name,
      });

      return championshipPayload(champ, user.id);
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 60 }),
        teamCount: t.Integer({ minimum: 3, maximum: 16 }),
        captainIds: t.Array(t.String(), { minItems: 1, maxItems: 16 }),
        levelBasis: t.Union([t.Literal("pelada"), t.Literal("captains")]),
        qualifiersCount: t.Integer({ minimum: 2, maximum: 16 }),
        snakeDraft: t.Boolean(),
        mode: t.Union([t.Literal("draft"), t.Literal("sorteio")]),
      }),
    }
  )

  // detalhe completo (qualquer membro) — usado para acompanhar draft/tabela ao vivo
  .get("/championships/:id", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (!(await isMember(champ.peladaId, user.id))) return status(403, { message: "Você não é membro desta pelada" });
    return championshipPayload(champ, user.id);
  })

  // edita configurações (enquanto o draft não começou)
  .patch(
    "/championships/:id",
    async ({ params, body, user, status }) => {
      const champ = await getChampionship(params.id);
      if (!champ) return status(404, { message: "Campeonato não encontrado" });
      if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
        return status(403, { message: "Apenas o manager ou um auxiliar pode editar o campeonato" });
      }
      if (champ.status !== "config") return status(400, { message: "As configurações só mudam antes do draft começar" });

      const captainIds = await teamCaptainIds(champ.id);
      const merged = {
        teamCount: captainIds.length,
        captainIds,
        levelBasis: body.levelBasis ?? champ.levelBasis,
        qualifiersCount: body.qualifiersCount ?? champ.qualifiersCount,
      };
      const configError = await validateConfig(champ.peladaId, merged);
      if (configError?.error) return status(400, { message: configError.error });

      await db
        .update(championships)
        .set({
          name: body.name?.trim() || champ.name,
          levelBasis: merged.levelBasis as Championship["levelBasis"],
          snakeDraft: body.snakeDraft ?? champ.snakeDraft,
          qualifiersCount: merged.qualifiersCount,
        })
        .where(eq(championships.id, champ.id));

      // reordena a ordem base do draft
      if (body.captainOrder) {
        for (let i = 0; i < body.captainOrder.length; i++) {
          await db
            .update(championshipTeams)
            .set({ orderIndex: i + 1 })
            .where(and(eq(championshipTeams.championshipId, champ.id), eq(championshipTeams.captainUserId, body.captainOrder[i])));
        }
      }
      const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
      return championshipPayload(updated, user.id);
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
        levelBasis: t.Optional(t.Union([t.Literal("pelada"), t.Literal("captains")])),
        snakeDraft: t.Optional(t.Boolean()),
        qualifiersCount: t.Optional(t.Integer({ minimum: 2, maximum: 16 })),
        captainOrder: t.Optional(t.Array(t.String(), { minItems: 1, maxItems: 16 })),
      }),
    }
  )

  // nova rodada de avaliação restrita aos capitães: raters = capitães, ratees = todos os membros
  .post("/championships/:id/captain-rating-round", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
      return status(403, { message: "Apenas o manager ou um auxiliar pode disparar a rodada" });
    }
    if (champ.status !== "config") return status(400, { message: "A rodada dos capitães vale antes do draft começar" });
    if (champ.levelBasis !== "captains") {
      return status(400, { message: "A rodada dos capitães vale quando o level usa a nota dos capitães" });
    }
    const pelada = await getPelada(champ.peladaId);
    if (!pelada) return status(404, { message: "Pelada não encontrada" });

    const captains = await teamCaptainIds(champ.id);
    if (captains.length === 0) return status(400, { message: "Nenhum capitão definido" });
    const members = await memberIds(champ.peladaId);

    // zera as pendências (e completadas) dos capitães na rodada atual e recria do zero
    await db
      .delete(ratingRequests)
      .where(
        and(
          eq(ratingRequests.peladaId, pelada.id),
          inArray(ratingRequests.raterId, captains),
          eq(ratingRequests.round, pelada.ratingRound)
        )
      );
    const requests = captains.flatMap((raterId) =>
      members.filter((rateeId) => rateeId !== raterId).map((rateeId) => ({ peladaId: pelada.id, raterId, rateeId, round: pelada.ratingRound }))
    );
    if (requests.length > 0) {
      await db
        .insert(ratingRequests)
        .values(requests)
        .onConflictDoNothing({ target: [ratingRequests.peladaId, ratingRequests.raterId, ratingRequests.rateeId, ratingRequests.round] });
    }

    await notify(captains, "captain_rating_round", {
      peladaId: pelada.id,
      championshipId: champ.id,
      championshipName: champ.name,
      round: pelada.ratingRound,
    });
    return championshipPayload(champ, user.id);
  })

  // opt-in: membro confirma presença no campeonato (entra no pool do draft)
  .post("/championships/:id/optin", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (!(await isMember(champ.peladaId, user.id))) return status(403, { message: "Você não é membro desta pelada" });
    if (champ.status !== "config") return status(400, { message: "As confirmações fecharam: o draft já começou" });
    await db
      .insert(championshipOptIns)
      .values({ championshipId: champ.id, userId: user.id })
      .onConflictDoNothing({ target: [championshipOptIns.championshipId, championshipOptIns.userId] });
    return { ok: true };
  })

  // cancela o próprio opt-in (enquanto o draft não começou)
  .delete("/championships/:id/optin", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (champ.status !== "config") return status(400, { message: "As confirmações fecharam: o draft já começou" });
    await db
      .delete(championshipOptIns)
      .where(and(eq(championshipOptIns.championshipId, champ.id), eq(championshipOptIns.userId, user.id)));
    return { ok: true };
  })

  // inicia o draft e congela o pool (apenas manager/auxiliares)
  .post("/championships/:id/draft/start", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
      return status(403, { message: "Apenas o manager ou um auxiliar pode iniciar o draft" });
    }
    if (champ.status !== "config") return status(400, { message: "O draft já foi iniciado" });
    const optIns = await db
      .select({ id: championshipOptIns.id })
      .from(championshipOptIns)
      .where(eq(championshipOptIns.championshipId, champ.id));
    if (optIns.length === 0) return status(400, { message: "Ninguém confirmou presença no campeonato ainda" });

    // capitães já começam nos próprios times
    const teamRows = await db.select().from(championshipTeams).where(eq(championshipTeams.championshipId, champ.id));
    await db
      .insert(championshipPlayers)
      .values(teamRows.map((t) => ({ teamId: t.id, userId: t.captainUserId })))
      .onConflictDoNothing({ target: [championshipPlayers.teamId, championshipPlayers.userId] });

    await db.update(championships).set({ status: "drafting" }).where(eq(championships.id, champ.id));
    await notify(
      teamRows.map((t) => t.captainUserId),
      "championship_draft_started",
      { peladaId: champ.peladaId, championshipId: champ.id, championshipName: champ.name }
    );
    const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
    return championshipPayload(updated, user.id);
  })

  // escolha de um capitão (ou do manager/auxiliar assumindo a vez)
  .post(
    "/championships/:id/draft/pick",
    async ({ params, body, user, status }) => {
      const champ = await getChampionship(params.id);
      if (!champ) return status(404, { message: "Campeonato não encontrado" });
      if (champ.status !== "drafting") return status(400, { message: "O draft não está aberto" });

      const teamRows = await db
        .select()
        .from(championshipTeams)
        .where(eq(championshipTeams.championshipId, champ.id))
        .orderBy(asc(championshipTeams.orderIndex));
      const n = teamRows.length;
      const pickCount = await db.select({ id: championshipPicks.id }).from(championshipPicks).where(eq(championshipPicks.championshipId, champ.id));

      const overall = pickCount.length;
      const order = roundOrder(
        teamRows.map((t) => t.id),
        champ.snakeDraft,
        Math.floor(overall / n)
      );
      const currentTeamId = order[overall % n];
      const currentTeam = teamRows.find((t) => t.id === currentTeamId)!;

      const isAdmin = await isManagerOrAssistant(champ.peladaId, user.id);
      if (!isAdmin && currentTeam.captainUserId !== user.id) {
        return status(403, { message: "Não é a vez deste capitão" });
      }

      // só pode escolher quem confirmou presença e ainda não está em time
      const [optIn] = await db
        .select({ id: championshipOptIns.id })
        .from(championshipOptIns)
        .where(and(eq(championshipOptIns.championshipId, champ.id), eq(championshipOptIns.userId, body.userId)))
        .limit(1);
      if (!optIn) return status(400, { message: "Este jogador não confirmou presença no campeonato" });
      const [already] = await db
        .select({ id: championshipPlayers.id })
        .from(championshipPlayers)
        .innerJoin(championshipTeams, eq(championshipTeams.id, championshipPlayers.teamId))
        .where(and(eq(championshipTeams.championshipId, champ.id), eq(championshipPlayers.userId, body.userId)))
        .limit(1);
      if (already) return status(400, { message: "Este jogador já foi escolhido" });

      await db.insert(championshipPicks).values({
        championshipId: champ.id,
        overall,
        round: Math.floor(overall / n) + 1,
        slot: (overall % n) + 1,
        teamId: currentTeam.id,
        userId: body.userId,
        pickedByUserId: user.id,
      });
      await db.insert(championshipPlayers).values({ teamId: currentTeam.id, userId: body.userId });

      const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
      return championshipPayload(updated, user.id);
    },
    { body: t.Object({ userId: t.String() }) }
  )

  // desfaz a última escolha (apenas manager/auxiliares)
  .post("/championships/:id/draft/undo", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
      return status(403, { message: "Apenas o manager ou um auxiliar pode desfazer uma escolha" });
    }
    if (champ.status !== "drafting") return status(400, { message: "O draft não está aberto" });

    const [last] = await db
      .select()
      .from(championshipPicks)
      .where(eq(championshipPicks.championshipId, champ.id))
      .orderBy(desc(championshipPicks.overall))
      .limit(1);
    if (!last) return status(400, { message: "Nada para desfazer" });
    await db.delete(championshipPicks).where(eq(championshipPicks.id, last.id));
    await db
      .delete(championshipPlayers)
      .where(and(eq(championshipPlayers.teamId, last.teamId), eq(championshipPlayers.userId, last.userId)));

    const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
    return championshipPayload(updated, user.id);
  })

  // fecha o draft, gera a tabela de todos contra todos (apenas manager/auxiliares)
  .post("/championships/:id/draft/finalize", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
      return status(403, { message: "Apenas o manager ou um auxiliar pode finalizar o draft" });
    }
    if (champ.status !== "drafting") return status(400, { message: "O draft não está aberto" });

    const teamRows = await db.select().from(championshipTeams).where(eq(championshipTeams.championshipId, champ.id));
    const playerRows = await db
      .select({ teamId: championshipPlayers.teamId })
      .from(championshipPlayers)
      .innerJoin(championshipTeams, eq(championshipTeams.id, championshipPlayers.teamId))
      .where(eq(championshipTeams.championshipId, champ.id));
    const withoutPlayer = teamRows.find((t) => !playerRows.some((p) => p.teamId === t.id));
    if (withoutPlayer) return status(400, { message: `O ${withoutPlayer.name} ainda não tem jogadores` });

    const byId = new Map(teamRows.map((t) => [t.id, t]));
    const rounds = roundRobinPairs(teamRows.length);
    for (let r = 0; r < rounds.length; r++) {
      const pairs = rounds[r];
      if (pairs.length === 0) continue;
      await db.insert(championshipMatches).values(
        pairs.map(([a, b], i) => ({
          championshipId: champ.id,
          stage: "group" as const,
          round: r + 1,
          slot: i,
          homeTeamId: byId.get(teamRows[a].id)!.id,
          awayTeamId: byId.get(teamRows[b].id)!.id,
        }))
      );
    }

    await db.update(championships).set({ status: "groups" }).where(eq(championships.id, champ.id));
    const memberList = await memberIds(champ.peladaId);
    await notify(memberList, "championship_draft_finalized", {
      peladaId: champ.peladaId,
      championshipId: champ.id,
      championshipName: champ.name,
    });
    const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
    return championshipPayload(updated, user.id);
  })

  // renomeia o time (capitão do time ou manager/auxiliares)
  .patch(
    "/championshipTeams/:id",
    async ({ params, body, user, status }) => {
      const [team] = await db.select().from(championshipTeams).where(eq(championshipTeams.id, params.id)).limit(1);
      if (!team) return status(404, { message: "Time não encontrado" });
      const champ = await getChampionship(team.championshipId);
      if (!champ) return status(404, { message: "Campeonato não encontrado" });
      if (champ.status === "finished" || champ.status === "cancelled") {
        return status(400, { message: "Este campeonato já foi encerrado" });
      }
      const isAdmin = await isManagerOrAssistant(champ.peladaId, user.id);
      if (!isAdmin && team.captainUserId !== user.id) {
        return status(403, { message: "Apenas o capitão do time ou a organização pode renomear" });
      }
      if (body.name !== undefined) {
        const name = body.name.trim();
        if (name.length === 0) return status(400, { message: "O nome do time não pode ficar vazio" });
        await db.update(championshipTeams).set({ name: name.slice(0, 40) }).where(eq(championshipTeams.id, team.id));
      }
      if (body.captainUserId !== undefined) {
        if (!isAdmin) return status(403, { message: "Apenas a organização pode trocar o capitão" });
        if (!(await isMember(champ.peladaId, body.captainUserId))) return status(400, { message: "O novo capitão precisa ser membro da pelada" });
        await db
          .update(championshipTeams)
          .set({ captainUserId: body.captainUserId })
          .where(eq(championshipTeams.id, team.id));
      }
      const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
      return championshipPayload(updated, user.id);
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
        captainUserId: t.Optional(t.String()),
      }),
    }
  )

  // repõe um jogador que saiu da pelada por outro do pool (apenas manager/auxiliares)
  .post(
    "/championshipTeams/:id/replace",
    async ({ params, body, user, status }) => {
      const [team] = await db.select().from(championshipTeams).where(eq(championshipTeams.id, params.id)).limit(1);
      if (!team) return status(404, { message: "Time não encontrado" });
      const champ = await getChampionship(team.championshipId);
      if (!champ) return status(404, { message: "Campeonato não encontrado" });
      if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
        return status(403, { message: "Apenas o manager ou um auxiliar pode repor jogadores" });
      }
      if (champ.status !== "groups" && champ.status !== "knockout") {
        return status(400, { message: "A reposição vale depois do draft fechado" });
      }
      const [from] = await db
        .select({ id: championshipPlayers.id })
        .from(championshipPlayers)
        .where(and(eq(championshipPlayers.teamId, team.id), eq(championshipPlayers.userId, body.fromUserId)))
        .limit(1);
      if (!from) return status(400, { message: "Este jogador não está nesse time" });
      if (!(await isMember(champ.peladaId, body.toUserId))) return status(400, { message: "O substituto precisa ser membro da pelada" });
      const [alreadyIn] = await db
        .select({ id: championshipPlayers.id })
        .from(championshipPlayers)
        .innerJoin(championshipTeams, eq(championshipTeams.id, championshipPlayers.teamId))
        .where(and(eq(championshipTeams.championshipId, champ.id), eq(championshipPlayers.userId, body.toUserId)))
        .limit(1);
      if (alreadyIn) return status(400, { message: "O substituto já joga em outro time deste campeonato" });

      await db.delete(championshipPlayers).where(eq(championshipPlayers.id, from.id));
      await db.insert(championshipPlayers).values({ teamId: team.id, userId: body.toUserId });

      const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
      return championshipPayload(updated, user.id);
    },
    { body: t.Object({ fromUserId: t.String(), toUserId: t.String() }) }
  )

  // lança o resultado + eventos de uma partida (apenas manager/auxiliares)
  .post(
    "/championships/:id/matches/:matchId/result",
    async ({ params, body, user, status }) => {
      const champ = await getChampionship(params.id);
      if (!champ) return status(404, { message: "Campeonato não encontrado" });
      if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
        return status(403, { message: "Apenas o manager ou um auxiliar pode lançar resultados" });
      }
      if (champ.status !== "groups" && champ.status !== "knockout") {
        return status(400, { message: "Os resultados abrem após o draft" });
      }
      const [match] = await db
        .select()
        .from(championshipMatches)
        .where(and(eq(championshipMatches.id, params.matchId), eq(championshipMatches.championshipId, champ.id)))
        .limit(1);
      if (!match) return status(404, { message: "Jogo não encontrado" });

      const events = body.events ?? [];
      const motmCount = events.filter((e) => e.type === "motm").length;
      if (motmCount > 1) return status(400, { message: "Só pode haver um melhor em jogo por partida" });

      let winnerTeamId: string | null = null;
      const drew = body.homeScore === body.awayScore;
      if (match.stage === "knockout") {
        if (drew) {
          if (!body.winnerTeamId || (body.winnerTeamId !== match.homeTeamId && body.winnerTeamId !== match.awayTeamId)) {
            return status(400, { message: "Empate no mata-mata: indique o vencedor dos pênaltis" });
          }
          winnerTeamId = body.winnerTeamId;
        } else {
          winnerTeamId = body.homeScore > body.awayScore ? match.homeTeamId : match.awayTeamId;
        }
      } else if (body.winnerTeamId) {
        return status(400, { message: "Vencedor só se define no mata-mata" });
      }

      // eventos só podem citar jogadores dos dois times
      const teamPlayerIds = new Set(
        (
          await db
            .select({ userId: championshipPlayers.userId })
            .from(championshipPlayers)
            .where(inArray(championshipPlayers.teamId, [match.homeTeamId, match.awayTeamId]))
        ).map((p) => p.userId)
      );
      const badEvent = events.find((e) => !teamPlayerIds.has(e.userId));
      if (badEvent) return status(400, { message: "Evento citando jogador fora das equipes envolvidas" });

      await db
        .update(championshipMatches)
        .set({
          homeScore: body.homeScore,
          awayScore: body.awayScore,
          homePenalties: drew && match.stage === "knockout" ? (body.homePenalties ?? null) : null,
          awayPenalties: drew && match.stage === "knockout" ? (body.awayPenalties ?? null) : null,
          winnerTeamId,
        })
        .where(eq(championshipMatches.id, match.id));
      await db.delete(championshipMatchEvents).where(eq(championshipMatchEvents.matchId, match.id));
      if (events.length > 0) {
        await db.insert(championshipMatchEvents).values(
          events.map((e) => ({ matchId: match.id, userId: e.userId, type: e.type }))
        );
      }

      if (match.stage === "knockout") await advanceKnockout(champ);

      const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
      return championshipPayload(updated, user.id);
    },
    {
      body: t.Object({
        homeScore: t.Integer({ minimum: 0 }),
        awayScore: t.Integer({ minimum: 0 }),
        events: t.Optional(
          t.Array(
            t.Object({
              userId: t.String(),
              type: t.Union([t.Literal("goal"), t.Literal("assist"), t.Literal("yellow"), t.Literal("red"), t.Literal("motm")]),
            }),
            { maxItems: 100 }
          )
        ),
        homePenalties: t.Optional(t.Integer({ minimum: 0 })),
        awayPenalties: t.Optional(t.Integer({ minimum: 0 })),
        winnerTeamId: t.Optional(t.String()),
      }),
    }
  )

  // finaliza uma rodada da fase de grupos (apenas manager/auxiliares)
  .post("/championships/:id/rounds/:round/finalize", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
      return status(403, { message: "Apenas o manager ou um auxiliar pode finalizar a rodada" });
    }
    if (champ.status !== "groups") return status(400, { message: "A fase de grupos não está aberta" });

    const round = Number(params.round);
    const roundMatches = await db
      .select()
      .from(championshipMatches)
      .where(and(eq(championshipMatches.championshipId, champ.id), eq(championshipMatches.stage, "group"), eq(championshipMatches.round, round)));
    if (roundMatches.length === 0) return status(404, { message: "Rodada não encontrada" });
    const missing = roundMatches.some((m) => m.homeScore === null || m.awayScore === null);
    if (missing) return status(400, { message: "Ainda há jogos sem resultado nesta rodada" });

    const [updatedBefore] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
    await advanceKnockout(updatedBefore);

    const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
    return championshipPayload(updated, user.id);
  })

  // gera o mata-mata manualmente (fallback) — exige fase de grupos completa
  .post("/championships/:id/knockout/generate", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
      return status(403, { message: "Apenas o manager ou um auxiliar pode gerar o mata-mata" });
    }
    if (champ.status !== "groups") return status(400, { message: "O mata-mata só nasce depois da fase de grupos" });
    const existing = await db
      .select({ id: championshipMatches.id })
      .from(championshipMatches)
      .where(and(eq(championshipMatches.championshipId, champ.id), eq(championshipMatches.stage, "knockout")))
      .limit(1);
    if (existing.length > 0) return status(409, { message: "O mata-mata já foi gerado" });

    await advanceKnockout(champ);
    const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
    return championshipPayload(updated, user.id);
  })

  // cancela o campeonato (apenas manager/auxiliares, a qualquer momento)
  .post("/championships/:id/cancel", async ({ params, user, status }) => {
    const champ = await getChampionship(params.id);
    if (!champ) return status(404, { message: "Campeonato não encontrado" });
    if (!(await isManagerOrAssistant(champ.peladaId, user.id))) {
      return status(403, { message: "Apenas o manager ou um auxiliar pode cancelar o campeonato" });
    }
    if (champ.status === "finished" || champ.status === "cancelled") {
      return status(400, { message: "Este campeonato já foi encerrado" });
    }
    await db
      .update(championships)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(championships.id, champ.id));
    const [updated] = await db.select().from(championships).where(eq(championships.id, champ.id)).limit(1);
    return championshipPayload(updated, user.id);
  });
