import { Elysia } from "elysia";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, executeRaw, schema } from "../../db";
import { authed } from "../auth";
import { getPelada, isMember, memberIds } from "../../lib/guards";

const { games, teams, teamPlayers, users } = schema;

export const statsModule = new Elysia().use(authed).get("/peladas/:id/stats", async ({ params, user, status }) => {
  const pelada = await getPelada(params.id);
  if (!pelada) return status(404, { message: "Pelada não encontrada" });
  if (!(await isMember(pelada.id, user.id))) return status(403, { message: "Você não é membro desta pelada" });

  // títulos por jogador (presença em time campeão)
  const titleRows = await executeRaw<{ id: string; name: string; titles: number }>(sql`
    SELECT u.id, u.name, COUNT(*)::int AS titles
    FROM team_players tp
    JOIN teams t ON t.id = tp.team_id AND t.is_champion = true
    JOIN games g ON g.id = t.game_id
    JOIN users u ON u.id = tp.user_id
    WHERE g.pelada_id = ${pelada.id}
    GROUP BY u.id, u.name
    ORDER BY titles DESC, u.name ASC
  `);
  const titlesByPlayer = titleRows.map((r) => ({ userId: r.id, name: r.name, titles: Number(r.titles) }));

  // goleiros campeões (consagrados pelo manager, independentes do time campeão)
  const keeperTitleRows = await executeRaw<{ id: string; name: string; titles: number }>(sql`
    SELECT u.id, u.name, COUNT(*)::int AS titles
    FROM games g
    JOIN users u ON u.id = g.champion_goalkeeper_id
    WHERE g.pelada_id = ${pelada.id}
    GROUP BY u.id, u.name
    ORDER BY titles DESC, u.name ASC
  `);
  const goalkeeperTitles = keeperTitleRows.map((r) => ({ userId: r.id, name: r.name, titles: Number(r.titles) }));

  // membros que menos ganharam (inclui quem nunca ganhou)
  const allMembers = await memberIds(pelada.id);
  const titlesMap = new Map(titlesByPlayer.map((t) => [t.userId, t.titles]));
  const nameRows = allMembers.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, allMembers))
    : [];
  const fewestTitles = nameRows
    .map((u) => ({ userId: u.id, name: u.name, titles: titlesMap.get(u.id) ?? 0 }))
    .sort((a, b) => a.titles - b.titles || a.name.localeCompare(b.name))
    .slice(0, 10);

  // histórico de campeões + time que mais se repetiu
  const championRows = await db
    .select({
      gameId: games.id,
      gameAt: games.gameAt,
      championGoalkeeperId: games.championGoalkeeperId,
      teamId: teams.id,
      teamName: teams.name,
      playerId: teamPlayers.userId,
      playerName: users.name,
    })
    .from(teams)
    .innerJoin(games, eq(games.id, teams.gameId))
    .leftJoin(teamPlayers, eq(teamPlayers.teamId, teams.id))
    .leftJoin(users, eq(users.id, teamPlayers.userId))
    .where(and(eq(games.peladaId, pelada.id), eq(teams.isChampion, true)))
    .orderBy(desc(games.gameAt));

  const byGame = new Map<
    string,
    { gameId: string; gameAt: Date; teamName: string; championGoalkeeperId: string | null; players: { id: string; name: string }[] }
  >();
  const teamSignatureCount = new Map<string, { signature: string[]; count: number }>();
  for (const row of championRows) {
    if (!byGame.has(row.gameId)) {
      byGame.set(row.gameId, {
        gameId: row.gameId,
        gameAt: row.gameAt,
        teamName: row.teamName,
        championGoalkeeperId: row.championGoalkeeperId,
        players: [],
      });
    }
    if (row.playerId) byGame.get(row.gameId)!.players.push({ id: row.playerId, name: row.playerName! });
  }
  for (const champ of byGame.values()) {
    const signature = champ.players.map((p) => p.id).sort();
    const key = signature.join(",");
    const entry = teamSignatureCount.get(key) ?? { signature, count: 0 };
    entry.count++;
    teamSignatureCount.set(key, entry);
  }
  const nameById = new Map(nameRows.map((u) => [u.id, u.name]));
  const mostRepeatedTeam = [...teamSignatureCount.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((e) => ({ count: e.count, players: e.signature.map((id) => ({ id, name: nameById.get(id) ?? "?" })) }));

  return {
    titlesByPlayer,
    goalkeeperTitles,
    fewestTitles,
    mostRepeatedTeam,
    history: [...byGame.values()].slice(0, 20).map((h) => ({
      ...h,
      championGoalkeeper: h.championGoalkeeperId
        ? { id: h.championGoalkeeperId, name: nameById.get(h.championGoalkeeperId) ?? "?" }
        : null,
    })),
  };
});
