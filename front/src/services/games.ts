import { api } from "../api";
import { unwrap } from "../lib/request";

export interface EntryInput {
  userId?: string;
  name?: string;
  rating?: number;
}

export const gamesService = {
  confirm: (gameId: string) => unwrap(api.games({ id: gameId }).confirm.post()),
  cancelConfirmation: (gameId: string) => unwrap(api.games({ id: gameId }).confirm.delete()),
  crownChampion: (gameId: string, teamId: string) => unwrap(api.games({ id: gameId }).champion.post({ teamId })),
  crownGoalkeeper: (gameId: string, userId: string) =>
    unwrap(api.games({ id: gameId })["champion-goalkeeper"].post({ userId })),
  saveEntries: (gameId: string, line: EntryInput[], keepers: EntryInput[]) =>
    unwrap(api.games({ id: gameId }).entries.post({ line, keepers })),
  drawTeams: (gameId: string) => unwrap(api.games({ id: gameId }).draw.post()),
};
