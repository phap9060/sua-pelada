import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconBallFootball, IconCards, IconCrown, IconShoe, IconStar, IconTrophy, IconUserCheck } from "@tabler/icons-react";
import { useOutletContext } from "react-router-dom";
import { useChampionshipOptIn, useChampionships } from "../../hooks/useChampionship";
import { useAuth } from "../../hooks/useAuth";
import { championshipsService } from "../../services/championships";
import { useQuery } from "@tanstack/react-query";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import { fmtDateTime } from "../../utils/date";
import type { ChampionshipPayload } from "../../types";
import { ChampionshipConfig } from "./championship/ChampionshipConfig";
import { DraftBoard } from "./championship/DraftBoard";
import { GroupsBoard } from "./championship/GroupsBoard";
import { KnockoutBoard } from "./championship/KnockoutBoard";
import type { PeladaOutletContext } from "./PeladaDetail";

const STATUS_LABEL: Record<string, string> = {
  config: "confirmando presença",
  drafting: "draft em andamento",
  groups: "fase de grupos",
  knockout: "mata-mata",
  finished: "encerrado",
  cancelled: "cancelado",
};

export function ChampionshipTab() {
  const { detail } = useOutletContext<PeladaOutletContext>();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useChampionships(detail.pelada.id);
  const [creating, setCreating] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  const champ = data.championship;
  const canManage = detail.myRole !== "member";
  const myUserId = user?.id ?? "";

  return (
    <Stack gap="md">
      {champ && (
        <Group justify="space-between" align="flex-end" wrap="nowrap">
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text className="eyebrow">Campeonato</Text>
            <Text fz={{ base: 24, sm: 30 }} fw={800} truncate>
              {champ.name}
            </Text>
          </Stack>
          <Badge color={champ.status === "finished" ? "refletor" : "grass"} variant="light" style={{ flex: "none" }}>
            {STATUS_LABEL[champ.status]}
          </Badge>
        </Group>
      )}

      {!champ && canManage && !creating && (
        <Card shadow="sm" padding="xl" radius="lg" withBorder>
          <EmptyState
            icon={<IconTrophy size={40} stroke={1.3} />}
            title="Nenhum campeonato rolando"
            hint="Monte um campeonato com draft de capitães, fase de grupos e mata-mata."
            action={
              <Button color="grass" size="md" onClick={() => setCreating(true)}>
                Criar campeonato
              </Button>
            }
          />
        </Card>
      )}

      {!champ && !canManage && (
        <Card shadow="sm" padding="xl" radius="lg" withBorder>
          <EmptyState
            icon={<IconTrophy size={40} stroke={1.3} />}
            title="Nenhum campeonato rolando"
            hint="Quando o manager ou um auxiliar montar um campeonato, você confirma presença aqui."
          />
        </Card>
      )}

      {!champ && canManage && creating && <ChampionshipConfig detail={detail} champ={null} />}

      {champ?.status === "config" && (
        canManage ? (
          <ChampionshipConfig detail={detail} champ={champ} />
        ) : (
          <MemberOptIn champ={champ} />
        )
      )}

      {champ?.status === "drafting" && <DraftBoard champ={champ} canManage={canManage} myUserId={myUserId} />}
      {champ?.status === "groups" && <GroupsBoard champ={champ} canManage={canManage} myUserId={myUserId} />}
      {champ?.status === "knockout" && <KnockoutBoard champ={champ} canManage={canManage} />}
      {champ?.status === "finished" && champ.champion && (
        <>
          <KnockoutBoard champ={champ} canManage={canManage} />
          <StatsCard champ={champ} />
        </>
      )}
      {champ?.status === "cancelled" && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Text c="dimmed" size="sm">
            Este campeonato foi cancelado pela organização.
          </Text>
          {canManage && (
            <Button variant="light" color="grass" size="compact-sm" mt="sm" onClick={() => setCreating(true)}>
              Criar um novo campeonato
            </Button>
          )}
        </Card>
      )}

      {historyId && <HistoryDetail historyId={historyId} onClose={() => setHistoryId(null)} />}

      {data.history.length > 0 && !historyId && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Group gap="xs" mb="sm">
            <IconCrown size={18} style={{ color: "var(--mantine-color-refletor-5)" }} />
            <Text fw={700} size="lg">
              Campeões anteriores
            </Text>
          </Group>
          <Stack gap="xs">
            {data.history.map((h) => (
              <Group key={h.id} justify="space-between" wrap="nowrap" px="xs" py={6} style={{ borderRadius: 10, cursor: "pointer" }}>
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text fw={700} size="sm" truncate>
                    {h.championTeamName ? `${h.name} — título: ${h.championTeamName}` : h.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {h.championTeamName ? `${h.championTeamName} · capitão ${h.championCaptainName}` : "cancelado"} · {fmtDateTime(h.finishedAt ?? h.cancelledAt ?? new Date())}
                  </Text>
                </Stack>
                <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setHistoryId(h.id)}>
                  Estatísticas
                </Button>
              </Group>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

/** Opt-in do membro: confirmar presença no campeonato entra no pool do draft. */
function MemberOptIn({ champ }: { champ: ChampionshipPayload }) {
  const optIn = useChampionshipOptIn(champ.id, champ.peladaId);
  const count = champ.pool.filter((p) => !p.picked).length;
  return (
    <Card shadow="sm" padding="xl" radius="lg" withBorder>
      <Stack align="center" gap="sm" py="sm">
        <IconUserCheck size={36} stroke={1.4} style={{ color: "var(--mantine-color-grass-5)" }} />
        <Text fw={700} size="lg" ta="center">
          {champ.name} vai rolar na pelada!
        </Text>
        <Text c="dimmed" size="sm" ta="center">
          Confirme presença para entrar no pool do draft ({count} confirmados até agora).
        </Text>
        {optIn.error != null && <ErrorBox error={optIn.error} />}
        <Button
          size="md"
          color="grass"
          loading={optIn.isPending}
          disabled={champ.myOptIn}
          onClick={() => optIn.mutate({ optIn: !champ.myOptIn })}
          variant={champ.myOptIn ? "light" : "filled"}
        >
          {champ.myOptIn ? "Presença confirmada" : "Confirmar presença"}
        </Button>
        {champ.myOptIn && (
          <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            onClick={() => optIn.mutate({ optIn: false })}
          >
            Retirar minha confirmação
          </Button>
        )}
      </Stack>
    </Card>
  );
}

/** Estatísticas completas de um campeonato (artilheiros, garçons, cartões, MDJ). */
function StatsCard({ champ }: { champ: ChampionshipPayload }) {
  const leaders = champ.leaders;
  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap="xs">
          <IconStar size={18} stroke={1.8} style={{ color: "var(--mantine-color-refletor-5)" }} />
          <Text fw={700} size="lg">
            Estatísticas do campeonato
          </Text>
        </Group>
        <Badge size="sm" variant="light" c="dimmed">
          {champ.name}
        </Badge>
      </Group>
      <Group align="flex-start" gap="lg" wrap="wrap">
        <LeadersList title="Artilharia" icon={<IconBallFootball size={12} />} items={leaders.goals} />
        <LeadersList title="Assistências" icon={<IconShoe size={12} />} items={leaders.assists} />
        <LeadersList title="Cartões" icon={<IconCards size={12} />} items={[...leaders.yellow, ...leaders.red].sort((a, b) => b.count - a.count)} />
        <LeadersList title="Melhor do jogo" icon={<IconStar size={12} />} items={leaders.motm} />
      </Group>
    </Card>
  );
}

function LeadersList({ title, icon, items }: { title: string; icon: React.ReactNode; items: { userId: string; name: string; count: number }[] }) {
  return (
    <Stack gap={4} maw={240} style={{ flex: 1, minWidth: 200 }}>
      <Text className="eyebrow" size="xs">
        {title}
      </Text>
      {items.length === 0 && <Text c="dimmed" size="xs">nada registrado</Text>}
      {items.slice(0, 5).map((l, i) => (
        <Group key={l.userId} justify="space-between" wrap="nowrap">
          <Text size="sm" fw={i === 0 ? 700 : 400} truncate maw={170}>
            {icon} {l.name}
          </Text>
          <Text className="digits" size="sm" fw={700}>
            {l.count}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

/** Visão completa de um campeonato encerrado (histórico). */
function HistoryDetail({ historyId, onClose }: { historyId: string; onClose: () => void }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["championship", "detail", historyId],
    queryFn: () => championshipsService.get(historyId),
  });

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  if (!data) return null;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text className="eyebrow">Histórico</Text>
        <Button variant="subtle" color="gray" size="compact-sm" onClick={onClose}>
          fechar
        </Button>
      </Group>
      {data.champion && (
        <Card shadow="sm" padding="xl" radius="lg" withBorder className="champion-glow">
          <Stack align="center" gap="xs">
            <IconTrophy size={40} stroke={1.2} style={{ color: "var(--mantine-color-refletor-5)" }} />
            <Text className="eyebrow" c="dimmed">
              {data.name} · Campeão
            </Text>
            <Text className="display" fz={{ base: 26, sm: 34 }}>
              {data.champion.teamName}
            </Text>
            <Text size="sm" c="dimmed">
              capitão {data.champion.captain.name}
            </Text>
          </Stack>
        </Card>
      )}
      <StatsCard champ={data} />
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Text className="eyebrow" size="xs" mb="sm">
          Jogos
        </Text>
        <Table fz="sm" horizontalSpacing="xs" verticalSpacing={5}>
          <Table.Tbody>
            {data.matches
              .filter((m) => m.homeScore !== null && m.awayScore !== null)
              .map((m) => (
                <Table.Tr key={m.id}>
                  <Table.Td>
                    <Text size="sm" fw={600} truncate maw={140}>
                      {m.homeTeamName}
                    </Text>
                  </Table.Td>
                  <Table.Td className="digits" ta="center" fw={800}>
                    {m.homeScore} x {m.awayScore}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600} truncate maw={140}>
                      {m.awayTeamName}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right" c="dimmed" fz="xs">
                    {m.stage === "knockout" ? `mata-mata F${m.round}` : `rodada ${m.round}`}
                  </Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}
