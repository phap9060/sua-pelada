import { Elysia } from "elysia";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { authed } from "../auth";

const { notifications } = schema;

export const notificationsModule = new Elysia()
  .use(authed)

  .get("/notifications", async ({ user }) => {
    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    return { unreadCount: count, items };
  })

  .post("/notifications/read-all", async ({ user }) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    return { ok: true };
  });
