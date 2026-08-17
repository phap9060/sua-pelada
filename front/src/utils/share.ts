import { fmtShort } from "./date";
import type { GamePayload } from "../types";

interface Row {
  userId: string;
  name: string;
  position: string;
  confirmedAt: Date;
  pos: number;
}

function block(icon: string, title: string, titulares: Row[], suplentes: Row[], capacity: number) {
  const rows = [
    `${icon} *${title} (${titulares.length + suplentes.length}/${capacity})*`,
    titulares.length ? "Titulares" : null,
    ...titulares.map((r) => `${r.pos}º ${r.name}`),
    titulares.length && suplentes.length ? "" : null,
    suplentes.length ? "Suplentes" : null,
    ...suplentes.map((r) => `${r.pos}º ${r.name}`),
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
  return rows;
}

/** Mensagem formatada da lista de confirmados para colar no WhatsApp. */
export function buildWhatsAppListMessage(game: GamePayload, peladaName: string, appUrl: string) {
  return [
    `⚽ *${peladaName}*`,
    `🗓 ${fmtShort(game.gameAt)}`,
    ``,
    block("✅", "LINHA", game.line.titulares, game.line.suplentes, game.listCapacity),
    ``,
    block("🧤", "GOLEIROS", game.keepers.titulares, game.keepers.suplentes, game.keeperCapacity),
    ``,
    `📲 Abre no app e confirma: ${appUrl}`,
  ].join("\n");
}

export function whatsappShareUrl(message: string) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}