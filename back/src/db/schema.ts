import {
  pgTable,
  uuid,
  text,
  integer,
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
  listCapacity: integer("list_capacity").notNull().default(20),
  playersPerTeam: integer("players_per_team").notNull().default(5),
  gameWeekday: integer("game_weekday").notNull().default(2), // 0=domingo
  gameTime: text("game_time").notNull().default("19:00"),
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
    stars: integer("stars").notNull(), // 1..5
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
