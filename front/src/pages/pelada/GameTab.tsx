import { useNow } from "../../hooks/useNow";
import { useCancelConfirmation, useConfirmGame, useCrownChampion, useCrownGoalkeeper, useGame } from "../../hooks/useGame";
import { ConfirmationButton } from "../../components/game/ConfirmationButton";
import { ConfirmationList } from "../../components/game/ConfirmationList";
import { TeamsGrid } from "../../components/game/TeamsGrid";
import { Scoreboard } from "../../components/game/Scoreboard";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { Loading } from "../../components/ui/Loading";
import { Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconCrown } from "@tabler/icons-react";
import { GloveIcon } from "../../components/GloveIcon";

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
  const canCrownKeeper = canManage && (game.status === "drawn" || game.status === "finished") && game.goalkeepers.length > 0 && !game.championGoalkeeper;

  return (
    <Stack gap="md">
      <Scoreboard game={game} now={now} />

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <ConfirmationButton
          game={game}
          now={now}
          isBusy={confirm.isPending || cancel.isPending}
          onConfirm={() => confirm.mutate(game.id)}
          onCancel={() => cancel.mutate(game.id)}
        />
        {confirm.isError && <ErrorBox error={confirm.error} />}
      </Card>

      <ConfirmationList game={game} peladaId={peladaId} peladaName={peladaName} />

      {showTeams && (
        <TeamsGrid game={game} canCrown={canManage} onCrown={(teamId) => crown.mutate({ gameId: game.id, teamId })} />
      )}

      {game.rotatingGoalkeepers.length > 0 && showTeams && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Group gap="xs" mb="sm">
            <GloveIcon size={20} color="var(--mantine-color-refletor-5)" />
            <Text fw={700} size="lg">
              Fila de goleiros (rotação)
            </Text>
          </Group>
          <Text c="dimmed" size="sm" mb="sm">
            Menos goleiros que times: eles rodam entre as partidas, na ordem de confirmação.
          </Text>
          <Stack gap={6}>
            {game.rotatingGoalkeepers.map((g, i) => (
              <Group key={g.userId} justify="space-between">
                <Group gap="sm">
                  <span className="shirt-num">{i + 1}º</span>
                  <Text>{g.name}</Text>
                </Group>
                <Badge color="refletor" variant="light" size="xs" leftSection={<GloveIcon size={12} />}>
                  goleiro
                </Badge>
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      {showTeams && game.goalkeepers.length > 0 && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <GloveIcon size={20} color="var(--mantine-color-refletor-5)" />
              <Text fw={700} size="lg">
                Goleiro campeão
              </Text>
            </Group>
            {game.championGoalkeeper && (
              <Group gap={4}>
                <IconCrown size={16} style={{ color: "var(--mantine-color-refletor-5)" }} />
                <Text fw={700}>{game.championGoalkeeper.name}</Text>
              </Group>
            )}
          </Group>
          {!game.championGoalkeeper && (
            <Text c="dimmed" size="sm" mb="sm">
              Ao fim da pelada, consagre o goleiro que mais se destacou no dia.
            </Text>
          )}
          {canCrownKeeper && (
            <Stack gap={6}>
              {game.goalkeepers.map((g) => (
                <Group key={g.userId} justify="space-between">
                  <Group gap="sm">
                    <Text>{g.name}</Text>
                    <Badge color="refletor" variant="light" size="xs" leftSection={<GloveIcon size={12} />}>
                      goleiro
                    </Badge>
                    {g.teamId ? <Badge size="xs" variant="light">{game.teams.find((t) => t.id === g.teamId)?.name}</Badge> : <Badge size="xs" variant="light">rotação</Badge>}
                  </Group>
                  <Button
                    variant="light"
                    color="refletor"
                    size="xs"
                    loading={crownKeeper.isPending}
                    onClick={() => crownKeeper.mutate({ gameId: game.id, userId: g.userId })}
                  >
                    Consagrar
                  </Button>
                </Group>
              ))}
            </Stack>
          )}
          {crownKeeper.isError && <ErrorBox error={crownKeeper.error} />}
        </Card>
      )}
    </Stack>
  );
}
