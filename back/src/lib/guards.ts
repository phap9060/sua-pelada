import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";

const { peladas, peladaMembers, peladaAssistants } = schema;

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

/** Manager OU auxiliar da pelada — ações de gestão (config, rodadas, campeões). */
export async function isManagerOrAssistant(peladaId: string, userId: string) {
  const [pelada] = await db
    .select({ managerId: peladas.managerId })
    .from(peladas)
    .where(eq(peladas.id, peladaId))
    .limit(1);
  if (!pelada) return false;
  if (pelada.managerId === userId) return true;
  const [assistant] = await db
    .select({ id: peladaAssistants.id })
    .from(peladaAssistants)
    .where(and(eq(peladaAssistants.peladaId, peladaId), eq(peladaAssistants.userId, userId)))
    .limit(1);
  return !!assistant;
}

export async function memberIds(peladaId: string, exceptUserId?: string) {
  const rows = await db
    .select({ userId: peladaMembers.userId })
    .from(peladaMembers)
    .where(eq(peladaMembers.peladaId, peladaId));
  return rows.map((r) => r.userId).filter((id) => id !== exceptUserId);
}
