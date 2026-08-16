import { api } from "../api";
import { unwrap } from "../lib/request";

export const notificationsService = {
  list: () => unwrap(api.notifications.get()),
  readAll: () => unwrap(api.notifications["read-all"].post()),
};
