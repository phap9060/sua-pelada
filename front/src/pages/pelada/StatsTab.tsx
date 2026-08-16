import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconCrown, IconHistory, IconRepeat, IconTrophy, IconTrendingDown } from "@tabler/icons-react";
import { useStats } from "../../hooks/useStats";
import { GloveIcon } from "../../components/GloveIcon";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { Loading } from "../../components/ui/Loading";
import { fmtDateTime } from "../../utils/date";

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Group gap="xs" mb="sm">
      <span style={{ color: "var(--mantine-color-refletor-5)", display: "inline-flex" }}>{icon}</span>
      <Title order={4}>{children}</Title>
    </Group>
  );
}

export function StatsTab({ peladaId }: { peladaId: string }) {
  const { data: stats, isLoading, isError, error } = useStats(peladaId);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  if (!stats) return <Loading />;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <SectionTitle icon={<IconTrophy size={18} />}>Mais títulos</SectionTitle>
        {stats.titlesByPlayer.length === 0 && <Text c="dimmed">Nenhum campeão consagrado ainda.</Text>}
        <Stack gap={6}>
          {stats.titlesByPlayer.map((p, i) => (
            <Group key={p.userId} justify="space-between">
              <Group gap="sm">
                <span className="shirt-num">{i + 1}º</span>
                <Text>{p.name}</Text>
              </Group>
              <Badge color="refletor" variant="light">
                <Group gap={4}>
                  <IconTrophy size={12} />
                  {p.titles}
                </Group>
              </Badge>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <SectionTitle icon={<GloveIcon size={18} />}>Goleiros campeões</SectionTitle>
        {stats.goalkeeperTitles.length === 0 && <Text c="dimmed">Nenhum goleiro campeão consagrado ainda.</Text>}
        <Stack gap={6}>
          {stats.goalkeeperTitles.map((p, i) => (
            <Group key={p.userId} justify="space-between">
              <Group gap="sm">
                <span className="shirt-num">{i + 1}º</span>
                <Text>{p.name}</Text>
              </Group>
              <Badge color="refletor" variant="light">
                <Group gap={4}>
                  <GloveIcon size={12} />
                  {p.titles}
                </Group>
              </Badge>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <SectionTitle icon={<IconTrendingDown size={18} />}>Menos títulos</SectionTitle>
        <Stack gap={6}>
          {stats.fewestTitles.map((p, i) => (
            <Group key={p.userId} justify="space-between">
              <Group gap="sm">
                <span className="shirt-num">{i + 1}º</span>
                <Text>{p.name}</Text>
              </Group>
              <Badge variant="light">{p.titles}</Badge>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <SectionTitle icon={<IconRepeat size={18} />}>Time campeão mais repetido</SectionTitle>
        {stats.mostRepeatedTeam.length === 0 && <Text c="dimmed">Sem dados ainda.</Text>}
        <Stack gap={6}>
          {stats.mostRepeatedTeam.map((t, i) => (
            <Group key={i} justify="space-between">
              <Text size="sm">{t.players.map((p) => p.name).join(", ")}</Text>
              <Badge color="refletor" variant="light">{t.count}x campeão</Badge>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <SectionTitle icon={<IconHistory size={18} />}>Histórico de campeões</SectionTitle>
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
                      Goleiro campeão: {h.championGoalkeeper.name}
                    </Text>
                  </>
                )}
              </Text>
              <IconCrown size={18} style={{ color: "var(--mantine-color-refletor-5)" }} />
            </Group>
          ))}
        </Stack>
      </Card>
    </SimpleGrid>
  );
}
