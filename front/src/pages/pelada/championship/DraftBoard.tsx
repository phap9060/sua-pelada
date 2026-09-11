import { useState } from "react";
import { Badge, Button, Card, Group, Modal, Stack, Text } from "@mantine/core";
import { IconArrowBackUp, IconChecks, IconTarget } from "@tabler/icons-react";
import { useDraftPick, useFinalizeDraft, useUndoPick } from "../../../hooks/useChampionship";
import { PlayerDot, PlayerRow } from "../../../components/ui/PlayerRow";
import { FieldPositionBadge } from "../../../components/ui/FieldPositionBadge";
import { ErrorBox } from "../../../components/ui/ErrorBox";
import type { ChampionshipPayload } from "../../../types";

interface Props {
  champ: ChampionshipPayload;
  canManage: boolean;
  myUserId: string;
}

const LEVEL_LABEL = { pelada: "média da pelada", captains: "média dos capitães" } as const;

/** Tela do draft ao vivo: vez do capitão, pool de escolhas e times se montando. */
export function DraftBoard({ champ, canManage, myUserId }: Props) {
  const pick = useDraftPick(champ.id);
  const undo = useUndoPick(champ.id);
  const finalize = useFinalizeDraft(champ.id);
  const [pending, setPending] = useState<string | null>(null);

  const current = champ.draft.current;
  const isMyTurn = current?.captainUserId === myUserId;
  const canPick = canManage || isMyTurn;
  const available = champ.pool.filter((p) => !p.picked);
  const allTeamsReady = champ.teams.every((t) => t.players.length > 0);
  const pendingPlayer = pending ? champ.pool.find((p) => p.userId === pending) : null;

  return (
    <Stack gap="md">
      <TurnBanner champ={champ} isMyTurn={!!isMyTurn} canManage={canManage} />

      <Group align="flex-start" gap="md" wrap="nowrap" style={{ overflowX: "auto" }}>
        <Card shadow="sm" padding="lg" radius="lg" withBorder style={{ flex: 1, minWidth: 280 }}>
          <Group gap="xs" mb="sm">
            <IconTarget size={18} stroke={1.8} style={{ color: "var(--mantine-color-grass-5)" }} />
            <Text fw={700} size="lg">
              Disponíveis ({available.length})
            </Text>
            <Badge size="sm" variant="light" c="dimmed">
              {LEVEL_LABEL[champ.levelBasis]}
            </Badge>
          </Group>
          {available.length === 0 && (
            <Text c="dimmed" size="sm">
              Pool esvaziado — finalize o draft para gerar a tabela.
            </Text>
          )}
          <Stack gap={2}>
            {available.map((p) => (
              <PlayerRow
                key={p.userId}
                name={p.name}
                position={p.position}
                trailing={
                  canPick ? (
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="grass"
                      loading={pick.isPending && pending === p.userId}
                      onClick={() => setPending(p.userId)}
                    >
                      Escolher
                    </Button>
                  ) : undefined
                }
              >
                <FieldPositionBadge primary={p.fieldPosition} secondary={p.fieldPositionSecondary} position={p.position} />
                <Badge size="xs" variant="light" color="grass">
                  {p.level.toFixed(1)}
                </Badge>
              </PlayerRow>
            ))}
          </Stack>
        </Card>

        <Stack gap="sm" style={{ flex: 1.2, minWidth: 280 }}>
          {champ.teams.map((team) => (
            <Card key={team.id} shadow="sm" padding="md" radius="lg" withBorder>
              <Group justify="space-between" mb={4} wrap="nowrap">
                <Text fw={800} size="md" truncate>
                  {team.name}
                </Text>
                <Badge size="sm" color="refletor" variant="light">
                  ⚓ {team.captain.name}
                </Badge>
              </Group>
              <Group gap={4}>
                {team.players.map((p) => (
                  <PlayerDot key={p.userId} name={p.name} position={p.position} />
                ))}
                {team.players.length === 0 && <Text c="dimmed" size="xs">aguardando escolhas…</Text>}
              </Group>
            </Card>
          ))}

          {canManage && (
            <Card shadow="sm" padding="md" radius="lg" withBorder>
              <Group gap="sm" justify="space-between" wrap="nowrap">
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-sm"
                  leftSection={<IconArrowBackUp size={14} />}
                  onClick={() => undo.mutate()}
                  loading={undo.isPending}
                >
                  Desfazer escolha
                </Button>
                <Button
                  color="grass"
                  size="compact-sm"
                  leftSection={<IconChecks size={14} />}
                  disabled={!allTeamsReady}
                  onClick={() => finalize.mutate()}
                  loading={finalize.isPending}
                >
                  Finalizar draft
                </Button>
              </Group>
              {finalize.error != null && <ErrorBox error={finalize.error} />}
              {undo.error != null && <ErrorBox error={undo.error} />}
              {pick.error != null && <ErrorBox error={pick.error} />}
            </Card>
          )}
        </Stack>
      </Group>

      <Modal opened={pending !== null} onClose={() => setPending(null)} centered size="sm">
        <Stack gap="sm" py="xs">
          <Text ta="center" fw={700} size="lg">
            Quer escolher jogador {pendingPlayer?.name ?? ""}?
          </Text>
          {pick.error != null && <ErrorBox error={pick.error} />}
          <Group justify="center" gap="sm">
            <Button variant="subtle" color="gray" onClick={() => setPending(null)}>
              Não
            </Button>
            <Button color="grass" loading={pick.isPending} onClick={() => pending && pick.mutate(pending, { onSuccess: () => setPending(null) })}>
              Escolher
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

/** Destaque da vez: card com realce quando é a vez de escolher. */
function TurnBanner({ champ, isMyTurn, canManage }: { champ: ChampionshipPayload; isMyTurn: boolean; canManage: boolean }) {
  const current = champ.draft.current;
  if (!current) return null;
  const mine = isMyTurn;
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="lg"
      withBorder
      style={mine ? { borderColor: "var(--mantine-color-grass-5)", boxShadow: "0 0 0 3px rgba(34,197,94,0.15)" } : undefined}
    >
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" className="eyebrow">
            Rodada {current.round} de escolhas
          </Text>
          <Text fw={800} size="lg">
            Vez de <span style={{ color: "var(--mantine-color-grass-5)" }}>{current.teamName}</span>
            {canManage && !mine ? " — você pode assumir a vez" : ""}
          </Text>
        </Stack>
        {mine && (
          <Badge size="lg" color="grass" variant="filled" leftSection={<IconTarget size={14} />}>
            Sua vez!
          </Badge>
        )}
      </Group>
    </Card>
  );
}
