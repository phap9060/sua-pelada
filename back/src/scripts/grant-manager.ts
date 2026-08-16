import { eq } from "drizzle-orm";
import { db, schema } from "../db";

const { users } = schema;

const email = process.argv[2]?.toLowerCase().trim();

if (!email) {
  console.error("Uso: bun run grant-manager email@ex.com");
  process.exit(1);
}

const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

if (!user) {
  console.error(`Usuário não encontrado: ${email}`);
  process.exit(1);
}

await db.update(users).set({ canManage: true }).where(eq(users.id, user.id));
console.log(`✅ ${user.name} (${user.email}) agora pode gerenciar uma pelada.`);
process.exit(0);
