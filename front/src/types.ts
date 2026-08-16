import type { api } from "./api";

type Data<T extends (...args: never[]) => Promise<{ data: unknown }>> = NonNullable<Awaited<ReturnType<T>>["data"]>;

type PeladaScoped = ReturnType<(typeof api)["peladas"]>;
type InviteScoped = ReturnType<(typeof api)["invites"]>;

export type User = Data<typeof api.auth.me.get>;
export type PlayerPosition = "line" | "keeper";
export type Mine = Data<typeof api.peladas.mine.get>;
export type Pelada = NonNullable<Mine["managed"]>;
export type PeladaDetail = Data<PeladaScoped["get"]>;
export type GamePayload = Data<PeladaScoped["game"]["get"]>;
export type StatsPayload = Data<PeladaScoped["stats"]["get"]>;
export type PendingRating = Data<typeof api.ratings.pending.get>[number];
export type NotificationsPayload = Data<typeof api.notifications.get>;
export type InviteInfo = Data<InviteScoped["get"]>;
