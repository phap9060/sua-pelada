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
