import { treaty } from "@elysiajs/eden";
import type { App } from "../../back/src/index";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = treaty<App>(BASE, { fetch: { credentials: "include" } });
