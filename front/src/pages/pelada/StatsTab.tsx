import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useStats } from "../../hooks/useStats";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { Loading } from "../../components/ui/Loading";
import { fmtDateTime } from "../../utils/date";

export function StatsTab({ peladaId }: { peladaId: string }) {
  const { data: stats, isLoading, isError, error } = useStats(peladaId);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  if (!stats) return <Loading />;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Title order={4} mb="sm">🏆 Mais títulos</Title>
        {stats.titlesByPlayer.length === 0 && <Text c="dimmed">Nenhum campeão consagrado ainda.</Text>}
        <Stack gap={6}>
          {stats.titlesByPlayer.map((p, i) => (
            <Group key={p.userId} justify="space-between">
              <Group gap="sm">
                <Text c="dimmed" w={28} ta="right">{i + 1}º</Text>
                <Text>{p.name}</Text>
              </Group>
              <Badge color="yellow" variant="light">{p.titles} 🏆</Badge>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Title order={4} mb="sm">🧤 Goleiros campeões</Title>
        {stats.goalkeeperTitles.length === 0 && <Text c="dimmed">Nenhum goleiro campeão consagrado ainda.</Text>}
        <Stack gap={6}>
          {stats.goalkeeperTitles.map((p, i) => (
            <Group key={p.userId} justify="space-between">
              <Group gap="sm">
                <Text c="dimmed" w={28} ta="right">{i + 1}º</Text>
                <Text>{p.name}</Text>
              </Group>
              <Badge color="yellow" variant="light">{p.titles} 🧤</Badge>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Title order={4} mb="sm">🥀 Menos títulos</Title>
        <Stack gap={6}>
          {stats.fewestTitles.map((p, i) => (
            <Group key={p.userId} justify="space-between">
              <Group gap="sm">
                <Text c="dimmed" w={28} ta="right">{i + 1}º</Text>
                <Text>{p.name}</Text>
              </Group>
              <Badge variant="light">{p.titles} 🏆</Badge>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Title order={4} mb="sm">🔁 Time campeão mais repetido</Title>
        {stats.mostRepeatedTeam.length === 0 && <Text c="dimmed">Sem dados ainda.</Text>}
        <Stack gap={6}>
          {stats.mostRepeatedTeam.map((t, i) => (
            <Group key={i} justify="space-between">
              <Text size="sm">{t.players.map((p) => p.name).join(", ")}</Text>
              <Badge color="yellow" variant="light">{t.count}x campeão</Badge>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Title order={4} mb="sm">📜 Histórico de campeões</Title>
        {stats.history.length === 0 && <Text c="dimmed">Nenhum jogo finalizado ainda.</Text>}
        <Stack gap={6}>
          {stats.history.map((h) => (
            <Group key={h.gameId} justify="space-between" wrap="wrap">
              <Text size="sm">
                <Text component="span" c="dimmed" size="xs">{fmtDateTime(h.gameAt)}</Text>
                <br />
                <b>{h.teamName}</b>: {h.players.map((p) => p.name).join(", ")}
                {h.championGoalkeeper && (
                  <>
                    <br />
                    <Text component="span" c="dimmed" size="xs">
                      🧤 Goleiro campeão: {h.championGoalkeeper.name}
                    </Text>
                  </>
                )}
              </Text>
              <Text>👑</Text>
            </Group>
          ))}
        </Stack>
      </Card>
    </SimpleGrid>
  );
}
