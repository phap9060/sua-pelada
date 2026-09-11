import type { api } from "./api";

type Data<T extends (...args: never[]) => Promise<{ data: unknown }>> = NonNullable<Awaited<ReturnType<T>>["data"]>;

type PeladaScoped = ReturnType<(typeof api)["peladas"]>;
type InviteScoped = ReturnType<(typeof api)["invites"]>;

export type User = Data<typeof api.auth.me.get>;
export type PlayerPosition = "line" | "keeper";
export type FieldPosition = "zagueiro" | "meia" | "atacante";
export type Mine = Data<typeof api.peladas.mine.get>;
export type Pelada = NonNullable<Mine["managed"]>;
export type PeladaDetail = Data<PeladaScoped["get"]>;
export type GamePayload = Data<PeladaScoped["game"]["get"]>;
export type StatsPayload = Data<PeladaScoped["stats"]["get"]>;
export type PendingRating = Data<typeof api.ratings.pending.get>[number];
export type NotificationsPayload = Data<typeof api.notifications.get>;
export type InviteInfo = Data<InviteScoped["get"]>;
export type ChampionshipListPayload = Data<PeladaScoped["championships"]["get"]>;
export type ChampionshipPayload = NonNullable<ChampionshipListPayload["championship"]>;
export type ChampionshipTeam = ChampionshipPayload["teams"][number];
export type ChampionshipMatch = ChampionshipPayload["matches"][number];
export type ChampionshipStanding = ChampionshipPayload["standings"][number];
export type ChampionshipHistoryEntry = ChampionshipListPayload["history"][number];
