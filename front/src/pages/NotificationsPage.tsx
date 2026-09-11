import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, Group, Stack, Text, Title } from "@mantine/core";
import {
  IconBellOff,
  IconBolt,
  IconCrown,
  IconLogout,
  IconMail,
  IconStar,
  IconTarget,
  IconTrophy,
  IconUserMinus,
  IconUserPlus,
} from "@tabler/icons-react";
import { useNotifications, useReadAllNotifications } from "../hooks/useNotifications";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Loading } from "../components/ui/Loading";
import { EmptyState } from "../components/ui/EmptyState";
import { fmtDateTime } from "../utils/date";

function message(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case "new_member":
      return `${data.memberName} entrou na pelada ${data.peladaName} — vá avaliá-lo!`;
    case "rating_round":
      return `Nova rodada de avaliações na pelada ${data.peladaName}. Reavalie todos os jogadores!`;
    case "game_open":
      return `A confirmação de presença ABRIU na pelada ${data.peladaName}. Corra para o botão!`;
    case "teams_drawn":
      return `Os times da pelada ${data.peladaName} foram sorteados. Confira!`;
    case "assistant":
      return `Você virou auxiliar da pelada ${data.peladaName}! Agora pode consagrar campeões, editar a pelada e disparar rodadas de avaliação.`;
    case "removed":
      return `Você foi removido da pelada ${data.peladaName}. Pode voltar pelo link de convite quando quiser.`;
    case "member_left":
      return `${data.memberName} saiu da pelada ${data.peladaName}.`;
    case "championship_created":
      return `Campeonato "${data.championshipName}" montado na pelada ${data.peladaName}! Confirme sua presença na aba Campeonato.`;
    case "captain_rating_round":
      return `Você foi escalado para avaliar a turma antes do draft do "${data.championshipName}". A nota atualizada vai direto para o campeonato!`;
    case "championship_draft_started":
      return `O draft do "${data.championshipName}" começou. Capitães, preparem as escolhas!`;
    case "championship_draft_finalized":
      return `Draft do "${data.championshipName}" finalizado. Confira os times e a tabela de jogos!`;
    case "championship_champion":
      return `${data.championTeamName} é o campeão do "${data.championshipName}"! Confira o histórico da pelada.`;
    default:
      return "Nova notificação";
  }
}

const ICONS: Record<string, React.ReactNode> = {
  new_member: <IconUserPlus size={18} stroke={1.6} />,
  rating_round: <IconStar size={18} stroke={1.6} />,
  game_open: <IconBolt size={18} stroke={1.6} />,
  teams_drawn: <IconTrophy size={18} stroke={1.6} />,
  assistant: <IconCrown size={18} stroke={1.6} />,
  removed: <IconUserMinus size={18} stroke={1.6} />,
  member_left: <IconLogout size={18} stroke={1.6} />,
  championship_created: <IconTrophy size={18} stroke={1.6} />,
  captain_rating_round: <IconStar size={18} stroke={1.6} />,
  championship_draft_started: <IconTarget size={18} stroke={1.6} />,
  championship_draft_finalized: <IconTrophy size={18} stroke={1.6} />,
  championship_champion: <IconCrown size={18} stroke={1.6} />,
};

export function NotificationsPage() {
  const { data, isLoading, isError, error } = useNotifications();
  const readAll = useReadAllNotifications();

  useEffect(() => {
    if (data && data.unreadCount > 0) readAll.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const items = data?.items ?? [];

  // agrupa por dia: HOJE / ONTEM / data completa
  const groups = useMemo(() => {
    const byDay = new Map<string, typeof items>();
    for (const n of items) {
      const d = new Date(n.createdAt);
      const today = new Date();
      const yesterday = new Date(Date.now() - 86_400_000);
      let label: string;
      if (d.toDateString() === today.toDateString()) label = "Hoje";
      else if (d.toDateString() === yesterday.toDateString()) label = "Ontem";
      else label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(d);
      if (!byDay.has(label)) byDay.set(label, []);
      byDay.get(label)!.push(n);
    }
    return [...byDay.entries()];
  }, [items]);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;

  return (
    <Stack gap="md">
      <Title order={2} fz={28}>
        Notificações
      </Title>

      {items.length === 0 && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <EmptyState
            icon={<IconBellOff size={34} stroke={1.4} />}
            title="Sem novidades"
            hint="Quando a lista abrir ou os times saírem, você fica sabendo aqui."
          />
        </Card>
      )}

      {groups.map(([day, list]) => (
        <Stack key={day} gap="xs">
          <Text className="eyebrow">{day}</Text>
          <Stack gap="xs">
            {list.map((n) => {
              const payload = n.data as Record<string, unknown>;
              const unread = !n.readAt;
              const body = (
                <Group wrap="nowrap" gap="sm" align="flex-start">
                  <span
                    style={{
                      flex: "none",
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: unread ? "var(--mantine-color-grass-4)" : "var(--sp-chalk-dim)",
                      background: unread ? "rgba(34,197,94,0.12)" : "rgba(232,242,234,0.05)",
                      border: "1px solid var(--sp-chalk-faint)",
                    }}
                  >
                    {ICONS[n.type] ?? <IconMail size={18} stroke={1.6} />}
                  </span>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={unread ? 700 : 400}>
                      {message(n.type, payload)}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {fmtDateTime(n.createdAt)}
                    </Text>
                  </Stack>
                  {unread && <span style={{ flex: "none", width: 8, height: 8, borderRadius: 999, background: "var(--mantine-color-grass-5)", marginTop: 8 }} />}
                </Group>
              );

              return (
                <Card key={n.id} shadow="sm" padding="md" radius="lg" withBorder style={{ opacity: n.readAt ? 0.65 : 1 }}>
                  {typeof payload.peladaId === "string" ? (
                    <Link to={`/peladas/${payload.peladaId}`} style={{ textDecoration: "none", color: "inherit" }}>
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </Card>
              );
            })}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
