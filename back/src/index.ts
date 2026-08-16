import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authModule } from "./modules/auth";
import { peladasModule, invitesPublicModule } from "./modules/peladas";
import { ratingsModule } from "./modules/ratings";
import { gamesModule } from "./modules/games";
import { notificationsModule } from "./modules/notifications";
import { statsModule } from "./modules/stats";
import { startScheduler } from "./jobs/scheduler";

const PORT = Number(process.env.PORT ?? 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN;

const app = new Elysia()
  .use(
    cors({
      // em produção (Railway), defina CORS_ORIGIN com a URL do front
      origin: CORS_ORIGIN ? CORS_ORIGIN.split(",") : true,
      credentials: true,
    })
  )
  .get("/health", () => ({ ok: true }))
  .use(authModule)
  .use(peladasModule)
  .use(invitesPublicModule)
  .use(ratingsModule)
  .use(gamesModule)
  .use(notificationsModule)
  .use(statsModule)
  .listen(PORT);

startScheduler();

console.log(`⚽ sua-pelada API rodando na porta ${app.server?.port}`);

export type App = typeof app;
