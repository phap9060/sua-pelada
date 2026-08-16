import { treaty } from "@elysiajs/eden";
import type { App } from "../../back/src/index";

const raw = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
// normaliza: "api" -> "/api"; URLs absolutas ficam intactas
const BASE = raw.startsWith("http") ? raw : raw.startsWith("/") ? raw : `/${raw}`;

// keepDomain: true impede o Eden de prepender "https://" em caminhos relativos (/api -> same-origin)
export const api = treaty<App>(BASE, { keepDomain: true, fetch: { credentials: "include" } });
