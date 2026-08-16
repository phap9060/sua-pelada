export interface CreatePeladaInput {
  name: string;
  selfRating: number;
  listCapacity: number;
  keeperCapacity: number;
  playersPerTeam: number;
  gameWeekday: number;
  gameTime: string;
  confirmOpenWeekday: number;
  confirmOpenTime: string;
  confirmCloseWeekday: number;
  confirmCloseTime: string;
}

export type UpdatePeladaInput = Omit<CreatePeladaInput, "selfRating">;
