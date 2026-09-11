import { api } from "../api";
import { unwrap } from "../lib/request";
import type { FieldPosition, PlayerPosition } from "../types";

export const authService = {
  register: (body: { name: string; email: string; password: string; position: PlayerPosition }) =>
    unwrap(api.auth.register.post(body)),
  login: (body: { email: string; password: string }) => unwrap(api.auth.login.post(body)),
  logout: () => unwrap(api.auth.logout.post()),
  me: () => unwrap(api.auth.me.get()),
  updatePosition: (position: PlayerPosition) => unwrap(api.auth.position.patch({ position })),
  updateProfile: (body: {
    name?: string;
    position?: PlayerPosition;
    fieldPosition?: FieldPosition;
    fieldPositionSecondary?: FieldPosition | null;
    selfRating?: number;
  }) => unwrap(api.auth.profile.patch(body)),
};
