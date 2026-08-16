import { Link } from "react-router-dom";
import { Badge, Button, Card, CopyButton, Group, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { IconCheck, IconCopy, IconPlus } from "@tabler/icons-react";
import { useMine } from "../hooks/useMine";
import { useAuth, useUpdatePosition } from "../hooks/useAuth";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Loading } from "../components/ui/Loading";
import { WEEKDAYS } from "../utils/date";
import type { PlayerPosition } from "../types";

export function Home() {
  const { user } = useAuth();
  const { data: mine, isLoading, isError, error } = useMine();
  const updatePosition = useUpdatePosition();
  const canManage = user?.canManage ?? false;

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  if (!mine) return <Loading />;

  const inviteUrl = mine.managed ? `${window.location.origin}/invite/${mine.managed.inviteToken}` : "";

  return (
    <Stack gap="lg">
      <Card shadow="sm" padding="md" radius="lg" withBorder>
        <Group justify="space-between" wrap="wrap">
          <Text fw={600} size="sm">
            Sua posição
          </Text>
          <SegmentedControl
            size="xs"
            value={user?.position ?? "line"}
            onChange={(v) => updatePosition.mutate(v as PlayerPosition)}
            disabled={updatePosition.isPending}
            data={[
              { value: "line", label: "⚽ Linha" },
              { value: "keeper", label: "🧤 Goleiro" },
            ]}
          />
        </Group>
        <Text size="xs" c="dimmed" mt={6}>
          Trocar a posição não zera suas notas. A avaliação usa {user?.position === "keeper" ? "luvas (1–5)" : "bolas (1–5)"}.
        </Text>
      </Card>

      {canManage && (
        <>
          <Title order={2}>Minhas peladas</Title>

          {mine.managed ? (
            <Card shadow="sm" padding="lg" radius="lg" withBorder>
              <Stack gap="sm">
                <Group justify="space-between" wrap="wrap">
                  <Group gap="xs">
                    <Text
                      component={Link}
                      to={`/peladas/${mine.managed.id}`}
                      fw={800}
                      size="xl"
                      c="grass.4"
                      style={{ textDecoration: "none" }}
                    >
                      {mine.managed.name}
                    </Text>
                    <Badge color="grass" variant="light">
                      você é o manager
                    </Badge>
                  </Group>
                </Group>
                <Text c="dimmed" size="sm">
                  Jogo: {WEEKDAYS[mine.managed.gameWeekday]} às {mine.managed.gameTime} · {mine.managed.playersPerTeam} por
                  time · {mine.managed.listCapacity} vagas
                </Text>
                <Group gap="xs" align="center">
                  <Text size="sm">Link de convite:</Text>
                  <Text size="sm" fw={600} style={{ wordBreak: "break-all" }} ff="monospace">
                    {inviteUrl}
                  </Text>
                  <CopyButton value={inviteUrl}>
                    {({ copied, copy }) => (
                      <Button size="xs" variant="light" onClick={copy} leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                        {copied ? "Copiado!" : "Copiar"}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
              </Stack>
            </Card>
          ) : (
            <Card shadow="sm" padding="xl" radius="lg" withBorder>
              <Stack align="center" gap="sm">
                <Text c="dimmed">Você ainda não gerencia uma pelada.</Text>
                <Button component={Link} to="/peladas/new" leftSection={<IconPlus size={18} />}>
                  Criar minha pelada
                </Button>
              </Stack>
            </Card>
          )}
        </>
      )}

      <Title order={3}>Peladas que eu jogo</Title>
      {mine.memberOf.length === 0 && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Text c="dimmed" ta="center">
            Você ainda não entrou em nenhuma pelada. Peça o link de convite ao manager!
          </Text>
        </Card>
      )}
      <Stack gap="sm">
        {mine.memberOf.map((p) => (
          <Card key={p.id} shadow="sm" padding="md" radius="lg" withBorder>
            <Group justify="space-between" wrap="wrap">
              <Text component={Link} to={`/peladas/${p.id}`} fw={700} c="grass.4" style={{ textDecoration: "none" }}>
                {p.name}
              </Text>
              <Text c="dimmed" size="sm">
                {WEEKDAYS[p.gameWeekday]} {p.gameTime}
              </Text>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
