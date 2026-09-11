import { api } from "../api";
import { unwrap } from "../lib/request";
import type { CreateChampionshipInput, MatchResultInput, UpdateChampionshipInput } from "./types";

export const championshipsService = {
  list: (peladaId: string) => unwrap(api.peladas({ id: peladaId }).championships.get()),
  get: (id: string) => unwrap(api.championships({ id }).get()),
  create: (peladaId: string, body: CreateChampionshipInput) => unwrap(api.peladas({ id: peladaId }).championship.post(body)),
  update: (id: string, body: UpdateChampionshipInput) => unwrap(api.championships({ id }).patch(body)),
  optIn: (id: string) => unwrap(api.championships({ id }).optin.post()),
  optOut: (id: string) => unwrap(api.championships({ id }).optin.delete()),
  startDraft: (id: string) => unwrap(api.championships({ id }).draft.start.post()),
  pick: (id: string, userId: string) => unwrap(api.championships({ id }).draft.pick.post({ userId })),
  undoPick: (id: string) => unwrap(api.championships({ id }).draft.undo.post()),
  finalizeDraft: (id: string) => unwrap(api.championships({ id }).draft.finalize.post()),
  renameTeam: (teamId: string, body: { name?: string; captainUserId?: string }) =>
    unwrap(api.championshipTeams({ id: teamId }).patch(body)),
  replacePlayer: (teamId: string, fromUserId: string, toUserId: string) =>
    unwrap(api.championshipTeams({ id: teamId }).replace.post({ fromUserId, toUserId })),
  postResult: (championshipId: string, matchId: string, body: MatchResultInput) =>
    unwrap(api.championships({ id: championshipId }).matches({ matchId }).result.post(body)),
  finalizeRound: (championshipId: string, round: number) =>
    unwrap(api.championships({ id: championshipId }).rounds({ round }).finalize.post()),
  generateKnockout: (championshipId: string) =>
    unwrap(api.championships({ id: championshipId }).knockout.generate.post()),
  cancel: (championshipId: string) => unwrap(api.championships({ id: championshipId }).cancel.post()),
};
