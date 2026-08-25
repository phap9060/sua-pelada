import { Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconCrown } from "@tabler/icons-react";
import { useNow } from "../../hooks/useNow";
import { useCancelConfirmation, useConfirmGame, useCrownChampion, useCrownGoalkeeper, useGame } from "../../hooks/useGame";
import { GameHero } from "../../components/game/GameHero";
import { ConfirmationList } from "../../components/game/ConfirmationList";
import { TeamsGrid } from "../../components/game/TeamsGrid";
import { GloveIcon } from "../../components/GloveIcon";
import { PlayerRow } from "../../components/ui/PlayerRow";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { Loading } from "../../components/ui/Loading";
import type { GamePayload } from "../../types";

interface Props {
  peladaId: string;
  peladaName: string;
  canManage: boolean;
}

export function GameTab({ peladaId, peladaName, canManage }: Props) {
  const now = useNow();
  const { data: game, isLoading, isError, error } = useGame(peladaId);
  const confirm = useConfirmGame(peladaId);
  const cancel = useCancelConfirmation(peladaId);
  const crown = useCrownChampion(peladaId);
  const crownKeeper = useCrownGoalkeeper(peladaId);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  if (!game) return <Loading label="Aguardando jogo…" />;

  const showTeams = (game.status === "drawn" || game.status === "finished") && game.teams.length > 0;
  const canCrownKeeper =
    canManage && (game.status === "drawn" || game.status === "finished") && game.goalkeepers.length > 0 && !game.championGoalkeeper;

  return (
    <Stack gap="md">
      <GameHero game={game} peladaId={peladaId} peladaName={peladaName} />

      <ConfirmationList game={game} peladaId={peladaId} peladaName={peladaName} />

      {showTeams && (
        <TeamsGrid game={game} canCrown={canManage} onCrown={(teamId) => crown.mutate({ gameId: game.id, teamId })} />
      )}

      {showTeams && game.rotatingGoalkeepers.length > 0 && <RotatingKeepersCard game={game} />}

      {showTeams && game.goalkeepers.length > 0 && (
        <ChampionKeeperCard
          game={game}
          canCrown={canCrownKeeper}
          onCrown={(userId) => crownKeeper.mutate({ gameId: game.id, userId })}
          isPending={crownKeeper.isPending}
          error={crownKeeper.error}
        />
      )}
    </Stack>
  );
}

/** Fila de goleiros na rotação. */
function RotatingKeepersCard({ game }: { game: GamePayload }) {
  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group gap="xs" mb="xs">
        <GloveIcon size={20} color="var(--mantine-color-refletor-5)" />
        <Text fw={700} size="lg">
          Fila de goleiros
        </Text>
      </Group>
      <Text c="dimmed" size="sm" mb="sm">
        Menos goleiros que times: eles rodam entre as partidas, na ordem de confirmação.
      </Text>
      <Stack gap={4}>
        {game.rotatingGoalkeepers.map((g, i) => (
          <PlayerRow key={g.userId} name={g.name} position="keeper" order={`${i + 1}º`} />
        ))}
      </Stack>
    </Card>
  );
}

interface ChampionKeeperProps {
  game: GamePayload;
  canCrown: boolean;
  onCrown: (userId: string) => void;
  isPending: boolean;
  error: unknown;
}

/** Consagração do goleiro campeão — momento âmbar. */
function ChampionKeeperCard({ game, canCrown, onCrown, isPending, error }: ChampionKeeperProps) {
  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder className={game.championGoalkeeper ? "champion-glow" : undefined}>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <GloveIcon size={20} color="var(--mantine-color-refletor-5)" />
          <Text fw={700} size="lg">
            Goleiro campeão
          </Text>
        </Group>
        {game.championGoalkeeper && (
          <Group gap={6}>
            <IconCrown size={18} style={{ color: "var(--mantine-color-refletor-5)" }} />
            <Text fw={700}>{game.championGoalkeeper.name}</Text>
          </Group>
        )}
      </Group>

      {!game.championGoalkeeper && (
        <Text c="dimmed" size="sm" mb="sm">
          Ao fim da pelada, consagre o goleiro que mais se destacou no dia.
        </Text>
      )}

      {canCrown && (
        <Stack gap={4}>
          {game.goalkeepers.map((g) => (
            <PlayerRow
              key={g.userId}
              name={g.name}
              position="keeper"
              trailing={
                <Button variant="light" color="refletor" size="compact-xs" loading={isPending} onClick={() => onCrown(g.userId)}>
                  Consagrar
                </Button>
              }
            >
              {g.teamId ? (
                <Badge size="xs" variant="light" c="dimmed">
                  {game.teams.find((t) => t.id === g.teamId)?.name ?? "rotação"}
                </Badge>
              ) : (
                <Badge size="xs" variant="light" c="dimmed">
                  rotação
                </Badge>
              )}
            </PlayerRow>
          ))}
        </Stack>
      )}
      {error != null && <ErrorBox error={error} />}
    </Card>
  );
}
