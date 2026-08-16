import { api } from "../api";
import { unwrap } from "../lib/request";

export const ratingsService = {
  pending: () => unwrap(api.ratings.pending.get()),
  complete: (requestId: string, stars: number) => unwrap(api.ratings.complete.post({ requestId, stars })),
};
