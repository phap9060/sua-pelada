import { api } from "../api";
import { unwrap } from "../lib/request";

export const invitesService = {
  info: (token: string) => unwrap(api.invites({ token }).get()),
  join: (token: string, selfRating: number) => unwrap(api.invites({ token }).join.post({ selfRating })),
};
