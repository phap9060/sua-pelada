import { useNow } from "../../hooks/useNow";
import { useCancelConfirmation, useConfirmGame, useCrownChampion, useCrownGoalkeeper, useGame } from "../../hooks/useGame";
import { ConfirmationButton } from "../../components/game/ConfirmationButton";
import { ConfirmationList } from "../../components/game/ConfirmationList";
import { TeamsGrid } from "../../components/game/TeamsGrid";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { Loading } from "../../components/ui/Loading";
import { Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { fmtDateTime } from "../../utils/date";

interface Props {
  peladaId: string;
  isManager: boolean;
  listCapacity: number;
}

export function GameTab({ peladaId, isManager, listCapacity }: Props) {
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
  const canCrownKeeper = isManager && (game.status === "drawn" || game.status === "finished") && game.goalkeepers.length > 0 && !game.championGoalkeeper;

  return (
    <Stack gap="md">
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Text fw={700} size="lg">
          Próximo jogo
        </Text>
        <Text c="dimmed" size="sm" mt={4}>
          {fmtDateTime(game.gameAt)} · confirmação abre {fmtDateTime(game.confirmOpenAt)} e fecha{" "}
          {fmtDateTime(game.confirmCloseAt)}
        </Text>
        <ConfirmationButton
          game={game}
          now={now}
          isBusy={confirm.isPending || cancel.isPending}
          onConfirm={() => confirm.mutate(game.id)}
          onCancel={() => cancel.mutate(game.id)}
        />
        {confirm.isError && <ErrorBox error={confirm.error} />}
      </Card>

      <ConfirmationList game={game} listCapacity={listCapacity} />

      {showTeams && (
        <TeamsGrid game={game} isManager={isManager} onCrown={(teamId) => crown.mutate({ gameId: game.id, teamId })} />
      )}

      {game.rotatingGoalkeepers.length > 0 && showTeams && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Text fw={700} size="lg" mb="sm">
            🧤 Fila de goleiros (rotação)
          </Text>
          <Text c="dimmed" size="sm" mb="sm">
            Menos goleiros que times: eles rodam entre as partidas, na ordem de confirmação.
          </Text>
          <Stack gap={6}>
            {game.rotatingGoalkeepers.map((g, i) => (
              <Group key={g.userId} justify="space-between">
                <Group gap="sm">
                  <Text c="dimmed" w={28} ta="right">
                    {i + 1}º
                  </Text>
                  <Text>{g.name}</Text>
                </Group>
                <Badge color="yellow" variant="light" size="xs">
                  🧤 goleiro
                </Badge>
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      {showTeams && game.goalkeepers.length > 0 && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Group justify="space-between" mb="sm">
            <Text fw={700} size="lg">
              🧤 Goleiro campeão
            </Text>
            {game.championGoalkeeper && <Text fw={700}>👑 {game.championGoalkeeper.name}</Text>}
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
                    <Badge color="yellow" variant="light" size="xs">
                      🧤
                    </Badge>
                    {g.teamId ? <Badge size="xs" variant="light">{game.teams.find((t) => t.id === g.teamId)?.name}</Badge> : <Badge size="xs" variant="light">rotação</Badge>}
                  </Group>
                  <Button
                    variant="light"
                    color="yellow"
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
