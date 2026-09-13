import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../../db";
import { isValidStars } from "../../lib/ratings";
import { type FieldPosition } from "../../db/schema";

const { users, ratings } = schema;

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-troque-em-producao";
const isProd = process.env.NODE_ENV === "production";

export const jwtSetup = jwt({ name: "jwt", secret: JWT_SECRET, exp: "7d" });

/** Plugin que exige usuário autenticado; expõe `user` no contexto. */
export const authed = new Elysia({ name: "authed" })
  .use(jwtSetup)
  .resolve({ as: "scoped" }, async ({ jwt, cookie, status }) => {
    const token = cookie?.auth_token?.value as string | undefined;
    const payload = token ? await jwt.verify(token) : false;
    const userId = payload && typeof payload === "object" ? (payload as { sub?: string }).sub : undefined;
    if (!userId) return status(401, { message: "Não autenticado" });
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return status(401, { message: "Não autenticado" });
    return { user };
  });

const credentials = t.Object({
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 6 }),
});

const position = t.Union([t.Literal("line"), t.Literal("keeper")]);
const fieldPosition = t.Union([t.Literal("zagueiro"), t.Literal("meia"), t.Literal("atacante")]);

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    canManage: u.canManage,
    position: u.position,
    fieldPosition: u.fieldPosition,
    fieldPositionSecondary: u.fieldPositionSecondary,
    selfRating: null,
  };
}

/** Última autoavaliação do usuário (nota pessoal), se existir. */
async function latestSelfRating(userId: string): Promise<number | null> {
  const [self] = await db
    .select({ stars: ratings.stars })
    .from(ratings)
    .where(and(eq(ratings.raterId, userId), eq(ratings.rateeId, userId)))
    .orderBy(desc(ratings.createdAt))
    .limit(1);
  return self ? self.stars : null;
}

export const authModule = new Elysia({ prefix: "/auth" })
  .use(jwtSetup)
  .post(
    "/register",
    async ({ body, jwt, cookie, status }) => {
      const email = body.email.toLowerCase().trim();
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing) return status(409, { message: "E-mail já cadastrado" });
      const passwordHash = await Bun.password.hash(body.password, { algorithm: "bcrypt", cost: 10 });
      const [user] = await db
        .insert(users)
        .values({ name: body.name.trim(), email, passwordHash, position: body.position })
        .returning();
      cookie.auth_token.set({
        value: await jwt.sign({ sub: user.id }),
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
      return publicUser(user);
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
        name: t.String({ minLength: 2 }),
        position,
      }),
    }
  )
  .post(
    "/login",
    async ({ body, jwt, cookie, status }) => {
      const email = body.email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      // senha pelada (resetada pela organização): entra com o e-mail e cria uma nova no modal
      if (user && user.mustResetPassword) {
        cookie.auth_token.set({
          value: await jwt.sign({ sub: user.id }),
          httpOnly: true,
          sameSite: isProd ? "none" : "lax",
          secure: isProd,
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
        return { ...publicUser(user), needsPasswordReset: true };
      }
      const ok = user && (await Bun.password.verify(body.password, user.passwordHash));
      if (!ok) return status(401, { message: "E-mail ou senha inválidos" });
      cookie.auth_token.set({
        value: await jwt.sign({ sub: user.id }),
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
      return publicUser(user);
    },
    { body: credentials }
  )
  .post("/logout", ({ cookie }) => {
    cookie.auth_token.remove();
    return { ok: true };
  })
  .use(authed)
  .get("/me", async ({ user }) => ({ ...publicUser(user), selfRating: await latestSelfRating(user.id) }))

  // cria a senha nova de uma conta com senha pelada (resetada pela organização)
  .post(
    "/password",
    async ({ body, user, status }) => {
      if (!user.mustResetPassword) return status(400, { message: "Não há reset de senha pendente" });
      if (body.password !== body.confirm) return status(400, { message: "As senhas não conferem" });
      const hash = await Bun.password.hash(body.password, { algorithm: "bcrypt", cost: 10 });
      await db
        .update(users)
        .set({ passwordHash: hash, mustResetPassword: false })
        .where(eq(users.id, user.id));
      return { ...publicUser({ ...user, mustResetPassword: false }), selfRating: await latestSelfRating(user.id) };
    },
    {
      body: t.Object({
        password: t.String({ minLength: 6, maxLength: 72 }),
        confirm: t.String({ minLength: 6, maxLength: 72 }),
      }),
    }
  )

  // usuário troca a própria posição (linha/goleiro); não zera as notas
  .patch(
    "/position",
    async ({ body, user }) => {
      const [updated] = await db.update(users).set({ position: body.position }).where(eq(users.id, user.id)).returning();
      return publicUser(updated);
    },
    { body: t.Object({ position }) }
  )
  // perfil: nome, posição e nota pessoal (autoavaliação vale para todas as peladas)
  .patch(
    "/profile",
    async ({ body, user, status }) => {
      if (body.selfRating != null && !isValidStars(body.selfRating)) {
        return status(400, { message: "A nota pessoal vai de 1 a 5 em passos de 0,5" });
      }
      const patch: {
        name?: string;
        position?: "line" | "keeper";
        fieldPosition?: FieldPosition;
        fieldPositionSecondary?: FieldPosition | null;
      } = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.position !== undefined) patch.position = body.position;
      if (body.fieldPosition !== undefined) patch.fieldPosition = body.fieldPosition;
      if (body.fieldPositionSecondary !== undefined) {
        // null limpa a secundária; valor preenchido precisa ser diferente da primária efetiva
        patch.fieldPositionSecondary = body.fieldPositionSecondary;
      }
      const effectivePrimary = body.fieldPosition ?? user.fieldPosition;
      const effectiveSecondary =
        body.fieldPositionSecondary !== undefined ? body.fieldPositionSecondary : user.fieldPositionSecondary;
      if (effectivePrimary === effectiveSecondary) {
        return status(400, { message: "A posição secundária tem que ser diferente da preferencial" });
      }
      if (Object.keys(patch).length > 0) {
        await db.update(users).set(patch).where(eq(users.id, user.id));
      }
      if (body.selfRating != null) {
        await db
          .update(ratings)
          .set({ stars: body.selfRating })
          .where(and(eq(ratings.raterId, user.id), eq(ratings.rateeId, user.id)));
      }
      const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      return { ...publicUser(updated), selfRating: await latestSelfRating(user.id) };
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 80 })),
        position: t.Optional(position),
        fieldPosition: t.Optional(fieldPosition),
        fieldPositionSecondary: t.Optional(t.Union([fieldPosition, t.Null()])),
        selfRating: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
      }),
    }
  );
