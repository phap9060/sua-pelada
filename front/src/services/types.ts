export interface CreatePeladaInput {
  name: string;
  selfRating: number;
  listCapacity: number;
  keeperCapacity: number;
  playersPerTeam: number;
  gameWeekday: number;
  gameTime: string;
  gameDuration: number;
  confirmOpenWeekday: number;
  confirmOpenTime: string;
  confirmCloseWeekday: number;
  confirmCloseTime: string;
}

export type UpdatePeladaInput = Omit<CreatePeladaInput, "selfRating">;

export type ChampionshipModeInput = "draft" | "sorteio";
export type ChampionshipLevelBasisInput = "pelada" | "captains";
export type MatchEventTypeInput = "goal" | "assist" | "yellow" | "red" | "motm";

export interface CreateChampionshipInput {
  name: string;
  teamCount: number;
  captainIds: string[];
  levelBasis: ChampionshipLevelBasisInput;
  qualifiersCount: number;
  snakeDraft: boolean;
  mode: ChampionshipModeInput;
}

export interface UpdateChampionshipInput {
  name?: string;
  levelBasis?: ChampionshipLevelBasisInput;
  snakeDraft?: boolean;
  qualifiersCount?: number;
  captainOrder?: string[];
}

export interface MatchResultInput {
  homeScore: number;
  awayScore: number;
  events?: { userId: string; type: MatchEventTypeInput }[];
  homePenalties?: number;
  awayPenalties?: number;
  winnerTeamId?: string;
}
