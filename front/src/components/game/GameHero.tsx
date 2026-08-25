import { Link } from "react-router-dom";
import { Box, Button, Card, Group, Progress, Stack, Text } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { StatusChip, gameChip } from "../ui/StatusChip";
import { MatchTimeline } from "./MatchTimeline";
import { ConfirmationButton } from "./ConfirmationButton";
import { ErrorBox } from "../ui/ErrorBox";
import { useConfirmGame, useCancelConfirmation } from "../../hooks/useGame";
import { fmtCountdown } from "../../utils/date";
import type { GamePayload } from "../../types";

interface GameHeroProps {
  game: GamePayload;
  peladaId: string;
  peladaName: string;
}

/**
 * O herói da Home: data em dígito de placar, linha de giz do dia,
 * botão de presença e a lista se enchendo em tempo real.
 */
export function GameHero({ game, peladaId, peladaName }: GameHeroProps) {
  const now = Date.now();
  const confirm = useConfirmGame(peladaId);
  const cancel = useCancelConfirmation(peladaId);

  const openAt = new Date(game.confirmOpenAt).getTime();
  const closeAt = new Date(game.confirmCloseAt).getTime();
  const isOpen = now >= openAt && now < closeAt && (game.status === "open" || game.status === "scheduled");

  let countdown: string;
  if (game.status === "finished") countdown = "encerrado";
  else if (now < openAt) countdown = `abre em ${fmtCountdown(openAt - now)}`;
  else if (now < closeAt) countdown = `fecha em ${fmtCountdown(closeAt - now)}`;
  else countdown = "encerrado";

  const confirmed = game.line.titulares.length + game.line.suplentes.length + game.keepers.titulares.length + game.keepers.suplentes.length;
  const total = game.listCapacity + game.keeperCapacity;
  const pct = total > 0 ? (confirmed / total) * 100 : 0;

  return (
    <Card withBorder padding="xl" className={game.status === "drawn" ? "" : undefined}>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box style={{ minWidth: 0 }}>
            <Text className="eyebrow">Próximo jogo</Text>
            <Text
              component={Link}
              to={`/peladas/${peladaId}`}
              fw={700}
              size="lg"
              c="dimmed"
              style={{ textDecoration: "none" }}
              truncate
            >
              {peladaName} <IconChevronRight size={14} style={{ verticalAlign: "-2px" }} />
            </Text>
          </Box>
          <StatusChip chip={gameChip(game, now)} />
        </Group>

        <Group justify="space-between" align="flex-end" gap="md" wrap="nowrap">
          <Text className="digits" fz={{ base: 38, sm: 46 }} lh={1} c="dark.0">
            {new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
              .format(new Date(game.gameAt))
              .replace(".", "")}
            <Text component="span" fz={26} c="dimmed" mx={6}>
              ·
            </Text>
            <Text component="span" fz={{ base: 30, sm: 36 }} c="grass.4">
              {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(game.gameAt))}
            </Text>
          </Text>
          <Text className={`digits${isOpen ? " countdown-live" : ""}`} fz={{ base: 18, sm: 22 }} c={isOpen ? "grass.4" : "dimmed"} ta="right">
            {countdown}
          </Text>
        </Group>

        <MatchTimeline game={game} now={now} />

        <ConfirmationButton
          game={game}
          now={now}
          isBusy={confirm.isPending || cancel.isPending}
          onConfirm={() => confirm.mutate(game.id)}
          onCancel={() => cancel.mutate(game.id)}
        />
        {confirm.isError && <ErrorBox error={confirm.error} />}

        <Stack gap={6}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {confirmed} de {total} vagas preenchidas
            </Text>
            <Link to={`/peladas/${peladaId}`} style={{ textDecoration: "none" }}>
              <Text size="xs" fw={600} c="grass.4">
                Ver lista completa
              </Text>
            </Link>
          </Group>
          <Progress value={pct} color="grass" size={6} radius="xl" />
        </Stack>
      </Stack>
    </Card>
  );
}
