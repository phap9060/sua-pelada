import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const playerPosition = ["line", "keeper"] as const;
export type PlayerPosition = (typeof playerPosition)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // tag que libera gerenciar uma pelada (futuro: assinatura paga)
  canManage: boolean("can_manage").notNull().default(false),
  // linha ou goleiro (alterável pelo próprio usuário; não zera as notas)
  position: text("position", { enum: playerPosition }).notNull().default("line"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const peladas = pgTable("peladas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // 1 pelada por manager
  managerId: uuid("manager_id")
    .notNull()
    .unique()
    .references(() => users.id),
  inviteToken: text("invite_token").notNull().unique(),
  // config do jogo (editável)
  listCapacity: integer("list_capacity").notNull().default(20), // vagas de LINHA
  keeperCapacity: integer("keeper_capacity").notNull().default(3), // vagas de GOLEIRO
  playersPerTeam: integer("players_per_team").notNull().default(5),
  gameWeekday: integer("game_weekday").notNull().default(2), // 0=domingo
  gameTime: text("game_time").notNull().default("19:00"),
  gameDuration: integer("game_duration").notNull().default(120), // minutos
  confirmOpenWeekday: integer("confirm_open_weekday").notNull().default(2),
  confirmOpenTime: text("confirm_open_time").notNull().default("08:00"),
  confirmCloseWeekday: integer("confirm_close_weekday").notNull().default(2),
  confirmCloseTime: text("confirm_close_time").notNull().default("18:00"),
  ratingRound: integer("rating_round").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const peladaMembers = pgTable(
  "pelada_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    peladaId: uuid("pelada_id")
      .notNull()
      .references(() => peladas.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pelada_members_unique").on(t.peladaId, t.userId)]
);

// auxiliares da pelada (máx. 3, nomeados pelo manager)
export const peladaAssistants = pgTable(
  "pelada_assistants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    peladaId: uuid("pelada_id")
      .notNull()
      .references(() => peladas.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pelada_assistants_unique").on(t.peladaId, t.userId)]
);

// quem saiu ou foi removido da pelada (seção "jogadores que desistiram")
export const peladaExits = pgTable(
  "pelada_exits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    peladaId: uuid("pelada_id")
      .notNull()
      .references(() => peladas.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // nome na data da saída (congela mesmo que o usuário mude o nome depois)
    name: text("name").notNull(),
    exitedAt: timestamp("exited_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pelada_exits_unique").on(t.peladaId, t.userId)]
);

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    peladaId: uuid("pelada_id")
      .notNull()
      .references(() => peladas.id, { onDelete: "cascade" }),
    raterId: uuid("rater_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rateeId: uuid("ratee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // 1..5 em passos de 0,5 (permite meia bola/meia luva)
    stars: real("stars").notNull(),
    round: integer("round").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ratings_unique").on(t.peladaId, t.raterId, t.rateeId)]
);

// "obrigações" de avaliação: quem ainda precisa avaliar quem
export const ratingRequests = pgTable(
  "rating_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    peladaId: uuid("pelada_id")
      .notNull()
      .references(() => peladas.id, { onDelete: "cascade" }),
    raterId: uuid("rater_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rateeId: uuid("ratee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    round: integer("round").notNull().default(1),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rating_requests_unique").on(t.peladaId, t.raterId, t.rateeId, t.round),
    index("rating_requests_pending_idx").on(t.raterId, t.completedAt),
  ]
);

export const gameStatus = ["scheduled", "open", "drawn", "finished"] as const;
export type GameStatus = (typeof gameStatus)[number];

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    peladaId: uuid("pelada_id")
      .notNull()
      .references(() => peladas.id, { onDelete: "cascade" }),
    gameAt: timestamp("game_at", { withTimezone: true }).notNull(),
    confirmOpenAt: timestamp("confirm_open_at", { withTimezone: true }).notNull(),
    confirmCloseAt: timestamp("confirm_close_at", { withTimezone: true }).notNull(),
    status: text("status", { enum: gameStatus }).notNull().default("scheduled"),
    // goleiro campeão consagrado pelo manager (opcional, independente do time campeão)
    championGoalkeeperId: uuid("champion_goalkeeper_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("games_pelada_idx").on(t.peladaId, t.gameAt)]
);

export const gameConfirmations = pgTable(
  "game_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("game_confirmations_unique").on(t.gameId, t.userId)]
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    queueOrder: integer("queue_order").notNull(),
    isChampion: boolean("is_champion").notNull().default(false),
  },
  (t) => [index("teams_game_idx").on(t.gameId)]
);

export const teamPlayers = pgTable(
  "team_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("team_players_unique").on(t.teamId, t.userId)]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // new_member | rating_round | game_open | teams_drawn | promoted
    data: jsonb("data").notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)]
);

// ---------- Campeonato (temporada interna da pelada) ----------

// "draft" aberto; "sorteio" existe na UI mas segue desabilitado
export const championshipModes = ["draft", "sorteio"] as const;
export type ChampionshipMode = (typeof championshipModes)[number];

export const championshipStatuses = ["config", "drafting", "groups", "knockout", "finished", "cancelled"] as const;
export type ChampionshipStatus = (typeof championshipStatuses)[number];

// base do level exibido no draft: média da pelada OU média das bolas dadas pelos capitães
export const championshipLevelBasis = ["pelada", "captains"] as const;
export type ChampionshipLevelBasis = (typeof championshipLevelBasis)[number];

export const championshipMatchStages = ["group", "knockout"] as const;
export type ChampionshipMatchStage = (typeof championshipMatchStages)[number];

export const matchEventTypes = ["goal", "assist", "yellow", "red", "motm"] as const;
export type MatchEventType = (typeof matchEventTypes)[number];

export const championships = pgTable(
  "championships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    peladaId: uuid("pelada_id")
      .notNull()
      .references(() => peladas.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mode: text("mode", { enum: championshipModes }).notNull().default("draft"),
    status: text("status", { enum: championshipStatuses }).notNull().default("config"),
    levelBasis: text("level_basis", { enum: championshipLevelBasis }).notNull().default("pelada"),
    snakeDraft: boolean("snake_draft").notNull().default(true),
    // quantos times passam para o mata-mata (potência de 2, entre 2 e N-2)
    qualifiersCount: integer("qualifiers_count").notNull().default(2),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [index("championships_pelada_idx").on(t.peladaId, t.createdAt)]
);

// opt-in: quem confirmou presença no campeonato entra no pool do draft
export const championshipOptIns = pgTable(
  "championship_opt_ins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("championship_opt_ins_unique").on(t.championshipId, t.userId)]
);

export const championshipTeams = pgTable(
  "championship_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    captainUserId: uuid("captain_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // posição do capitão na ordem base do draft (1..N, pior level primeiro por padrão)
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("championship_teams_captain_unique").on(t.championshipId, t.captainUserId),
    index("championship_teams_champ_idx").on(t.championshipId),
  ]
);

export const championshipPlayers = pgTable(
  "championship_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => championshipTeams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("championship_players_unique").on(t.teamId, t.userId),
    index("championship_players_user_idx").on(t.userId),
  ]
);

// histórico de escolhas do draft (permite undo e reconstruir a ordem)
export const championshipPicks = pgTable(
  "championship_picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    // overall da escolha (0-based): round = floor(overall / N), slot = overall % N
    overall: integer("overall").notNull(),
    round: integer("round").notNull(), // 1-based
    slot: integer("slot").notNull(), // posição do time dentro da rodada (1-based)
    teamId: uuid("team_id")
      .notNull()
      .references(() => championshipTeams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pickedByUserId: uuid("picked_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("championship_picks_overall_unique").on(t.championshipId, t.overall),
    uniqueIndex("championship_picks_user_unique").on(t.championshipId, t.userId),
  ]
);

export const championshipMatches = pgTable(
  "championship_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    stage: text("stage", { enum: championshipMatchStages }).notNull(),
    // fase de grupos: rodada 1..N-1; mata-mata: 1 = primeira fase do mata, cresce até a final
    round: integer("round").notNull(),
    slot: integer("slot").notNull().default(0), // ordem do jogo dentro da rodada
    homeTeamId: uuid("home_team_id")
      .notNull()
      .references(() => championshipTeams.id, { onDelete: "cascade" }),
    awayTeamId: uuid("away_team_id")
      .notNull()
      .references(() => championshipTeams.id, { onDelete: "cascade" }),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    // mata-mata: placar dos pênaltis quando empata no tempo normal
    homePenalties: integer("home_penalties"),
    awayPenalties: integer("away_penalties"),
    winnerTeamId: uuid("winner_team_id").references(() => championshipTeams.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("championship_matches_champ_idx").on(t.championshipId, t.stage, t.round)]
);

// eventos de uma partida: gols/assistências/cartões/melhor do jogo (sem minuto)
export const championshipMatchEvents = pgTable(
  "championship_match_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => championshipMatches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: matchEventTypes }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("championship_match_events_match_idx").on(t.matchId)]
);
