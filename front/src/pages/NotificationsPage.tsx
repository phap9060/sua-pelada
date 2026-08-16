import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useNotifications, useReadAllNotifications } from "../hooks/useNotifications";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Loading } from "../components/ui/Loading";
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
    default:
      return "Nova notificação";
  }
}

export function NotificationsPage() {
  const { data, isLoading, isError, error } = useNotifications();
  const readAll = useReadAllNotifications();

  useEffect(() => {
    if (data && data.unreadCount > 0) readAll.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;

  const items = data?.items ?? [];

  return (
    <Stack gap="md">
      <Title order={2}>Notificações</Title>
      {items.length === 0 && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Text c="dimmed" ta="center">
            Nenhuma notificação ainda.
          </Text>
        </Card>
      )}
      <Stack gap={6}>
        {items.map((n) => {
          const payload = n.data as Record<string, unknown>;
          const inner = (
            <>
              <Text size="sm" style={{ flex: 1 }}>
                {message(n.type, payload)}
              </Text>
              <Text c="dimmed" size="xs">
                {fmtDateTime(n.createdAt)}
              </Text>
            </>
          );
          return (
            <Card
              key={n.id}
              shadow="sm"
              padding="md"
              radius="lg"
              withBorder
              style={{ opacity: n.readAt ? 0.6 : 1 }}
            >
              {typeof payload.peladaId === "string" ? (
                <Link to={`/peladas/${payload.peladaId}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Group wrap="nowrap" gap="sm">
                    {inner}
                  </Group>
                </Link>
              ) : (
                <Group wrap="nowrap" gap="sm">
                  {inner}
                </Group>
              )}
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
