import { db, schema } from "../db";

const { notifications } = schema;

export async function notify(userIds: string[], type: string, data: Record<string, unknown> = {}) {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(userIds.map((userId) => ({ userId, type, data })));
}
