import { Badge } from "@mantine/core";
import type { GamePayload } from "../../types";

export interface Chip {
  label: string;
  color: string;
  live?: boolean;
}

/** Estado do jogo: espera, aberto, fechado, sorteado ou finalizado. */
export function gameChip(game: GamePayload, now: number): Chip {
  const openAt = new Date(game.confirmOpenAt).getTime();
  const closeAt = new Date(game.confirmCloseAt).getTime();
  if (game.status === "finished") return { label: "Finalizado", color: "gray" };
  if (game.status === "drawn") return { label: "Sorteado", color: "refletor" };
  if (now >= closeAt) return { label: "Fechado", color: "gray" };
  if (now >= openAt) return { label: "Aberto", color: "grass", live: true };
  return { label: "Em espera", color: "gray" };
}

export function StatusChip({ chip, size = "md" }: { chip: Chip; size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <Badge
      color={chip.color}
      variant={chip.live ? "filled" : "light"}
      size={size}
      leftSection={
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: chip.live ? "#fff" : "currentColor",
            opacity: chip.live ? 1 : 0.7,
            display: "inline-block",
          }}
        />
      }
      className={chip.live ? "countdown-live" : undefined}
      style={{ letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700 }}
    >
      {chip.label}
    </Badge>
  );
}
