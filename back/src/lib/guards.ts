import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";

const { peladas, peladaMembers } = schema;

export async function getPelada(peladaId: string) {
  const [pelada] = await db.select().from(peladas).where(eq(peladas.id, peladaId)).limit(1);
  return pelada ?? null;
}

export async function isMember(peladaId: string, userId: string) {
  const [m] = await db
    .select({ id: peladaMembers.id })
    .from(peladaMembers)
    .where(and(eq(peladaMembers.peladaId, peladaId), eq(peladaMembers.userId, userId)))
    .limit(1);
  return !!m;
}

export async function memberIds(peladaId: string, exceptUserId?: string) {
  const rows = await db
    .select({ userId: peladaMembers.userId })
    .from(peladaMembers)
    .where(eq(peladaMembers.peladaId, peladaId));
  return rows.map((r) => r.userId).filter((id) => id !== exceptUserId);
}
