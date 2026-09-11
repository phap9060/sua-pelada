import { api } from "../api";
import { unwrap } from "../lib/request";
import type { CreatePeladaInput, UpdatePeladaInput } from "./types";

export const peladasService = {
  mine: () => unwrap(api.peladas.mine.get()),
  get: (id: string) => unwrap(api.peladas({ id }).get()),
  create: (body: CreatePeladaInput) => unwrap(api.peladas.post(body)),
  update: (id: string, body: UpdatePeladaInput) => unwrap(api.peladas({ id }).patch(body)),
  currentGame: (id: string) => unwrap(api.peladas({ id }).game.get()),
  triggerRatingRound: (id: string) => unwrap(api.peladas({ id })["rating-round"].post()),
  stats: (id: string) => unwrap(api.peladas({ id }).stats.get()),
  appointAssistant: (id: string, userId: string) => unwrap(api.peladas({ id }).assistants.post({ userId })),
  removeAssistant: (id: string, userId: string) => unwrap(api.peladas({ id }).assistants({ userId }).delete()),
  removeMember: (id: string, userId: string) => unwrap(api.peladas({ id }).members({ userId }).delete()),
  leave: (id: string) => unwrap(api.peladas({ id }).leave.delete()),
};
