import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import { fmtCountdown, fmtShort } from "../../utils/date";
import type { GamePayload } from "../../types";

interface Props {
  game: GamePayload;
  now: number;
}

function statusChip(game: GamePayload, now: number) {
  const openAt = new Date(game.confirmOpenAt).getTime();
  const closeAt = new Date(game.confirmCloseAt).getTime();
  if (game.status === "finished") return { label: "FINALIZADO", color: "gray" as const };
  if (game.status === "drawn") return { label: "SORTEADO", color: "refletor" as const };
  if (now >= closeAt) return { label: "FECHADO", color: "gray" as const };
  if (now >= openAt) return { label: "ABERTO", color: "grass" as const };
  return { label: "ESPERA", color: "gray" as const };
}

/** Placar do jogo: data/hora em dígitos de campo, status, contagem e cotas. */
export function Scoreboard({ game, now }: Props) {
  const openAt = new Date(game.confirmOpenAt).getTime();
  const closeAt = new Date(game.confirmCloseAt).getTime();
  const chip = statusChip(game, now);

  let countdown: string;
  if (now < openAt) countdown = `abre em ${fmtCountdown(openAt - now)}`;
  else if (now < closeAt) countdown = `fecha em ${fmtCountdown(closeAt - now)}`;
  else countdown = "encerrada";

  const lines = game.line.titulares.length + game.line.suplentes.length;
  const keepers = game.keepers.titulares.length + game.keepers.suplentes.length;

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group justify="space-between" wrap="wrap">
        <Stack gap={0}>
          <Text size="xs" c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Próximo jogo
          </Text>
          <Text className="digits" size="28px" c="dark.0" style={{ lineHeight: 1.1 }}>
            {fmtShort(game.gameAt)}
          </Text>
        </Stack>
        <Group gap="sm">
          <Stack gap={0} align="flex-end">
            <Text className="digits" size="20px" c="grass.4">
              {countdown}
            </Text>
            <Text size="xs" c="dimmed">
              {lines}/{game.listCapacity} linha · {keepers}/{game.keeperCapacity} goleiros
            </Text>
          </Stack>
          <Badge color={chip.color} variant="light" size="lg" className="digits" style={{ letterSpacing: "0.06em" }}>
            {chip.label}
          </Badge>
        </Group>
      </Group>
    </Card>
  );
}
