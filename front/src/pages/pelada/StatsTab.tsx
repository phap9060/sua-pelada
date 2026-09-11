import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconCrown, IconHistory, IconRepeat, IconTrophy } from "@tabler/icons-react";
import { useOutletContext } from "react-router-dom";
import { useStats } from "../../hooks/useStats";
import { GloveIcon } from "../../components/GloveIcon";
import { PlayerRow } from "../../components/ui/PlayerRow";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { Loading } from "../../components/ui/Loading";
import { fmtDateTime } from "../../utils/date";
import type { PeladaOutletContext } from "./PeladaDetail";

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Group gap="xs" mb="sm">
      <span style={{ color: "var(--mantine-color-refletor-5)", display: "inline-flex" }}>{icon}</span>
      <Title order={4}>{children}</Title>
    </Group>
  );
}

function TrophyBadge({ icon, count }: { icon: React.ReactNode; count: number }) {
  return (
    <Badge color="refletor" variant="light">
      <Group gap={4}>
        {icon}
        <span className="digits">{count}</span>
      </Group>
    </Badge>
  );
}

export function StatsTab() {
  const { detail } = useOutletContext<PeladaOutletContext>();
  const { data: stats, isLoading, isError, error } = useStats(detail.pelada.id);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  if (!stats) return <Loading />;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <SectionTitle icon={<IconTrophy size={18} />}>Mais títulos</SectionTitle>
        {stats.titlesByPlayer.length === 0 && <Text c="dimmed" size="sm">Nenhum campeão consagrado ainda.</Text>}
        <Stack gap={2}>
          {stats.titlesByPlayer.map((p, i) => (
            <PlayerRow
              key={p.userId}
              name={p.name}
              order={`${i + 1}º`}
              trailing={<TrophyBadge icon={<IconTrophy size={12} />} count={p.titles} />}
            />
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <SectionTitle icon={<GloveIcon size={18} />}>Goleiros campeões</SectionTitle>
        {stats.goalkeeperTitles.length === 0 && <Text c="dimmed" size="sm">Nenhum goleiro campeão consagrado ainda.</Text>}
        <Stack gap={2}>
          {stats.goalkeeperTitles.map((p, i) => (
            <PlayerRow
              key={p.userId}
              name={p.name}
              position="keeper"
              order={`${i + 1}º`}
              trailing={<TrophyBadge icon={<GloveIcon size={12} />} count={p.titles} />}
            />
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <SectionTitle icon={<IconCrown size={18} />}>Menos títulos</SectionTitle>
        <Stack gap={2}>
          {stats.fewestTitles.map((p, i) => (
            <PlayerRow
              key={p.userId}
              name={p.name}
              order={`${i + 1}º`}
              trailing={
                <Badge variant="light">
                  <span className="digits">{p.titles}</span>
                </Badge>
              }
            />
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <SectionTitle icon={<IconRepeat size={18} />}>Time campeão mais repetido</SectionTitle>
        {stats.mostRepeatedTeam.length === 0 && <Text c="dimmed" size="sm">Sem dados ainda.</Text>}
        <Stack gap={2}>
          {stats.mostRepeatedTeam.map((t, i) => (
            <PlayerRow
              key={i}
              name={t.players.map((p) => p.name).join(", ")}
              order={`${i + 1}º`}
              trailing={
                <Badge color="refletor" variant="light">
                  <span className="digits">{t.count}x</span> campeão
                </Badge>
              }
            />
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder style={{ gridColumn: "1 / -1" }}>
        <SectionTitle icon={<IconHistory size={18} />}>Histórico de campeões</SectionTitle>
        {stats.history.length === 0 && <Text c="dimmed" size="sm">Nenhum jogo finalizado ainda.</Text>}
        <Stack gap={2}>
          {stats.history.map((h) => (
            <PlayerRow
              key={h.gameId}
              name={h.teamName}
              trailing={<IconCrown size={18} style={{ color: "var(--mantine-color-refletor-5)" }} />}
            >
              <Text c="dimmed" size="xs" className="digits">
                {fmtDateTime(h.gameAt)}
              </Text>
              <Text c="dimmed" size="xs" truncate maw={300}>
                {h.players.map((p) => p.name).join(", ")}
                {h.championGoalkeeper && ` · gk ${h.championGoalkeeper.name}`}
              </Text>
            </PlayerRow>
          ))}
        </Stack>
      </Card>
    </SimpleGrid>
  );
}