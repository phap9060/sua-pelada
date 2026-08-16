import { useState } from "react";
import { Badge, Box, Button, Card, CopyButton, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useTriggerRatingRound } from "../../hooks/usePelada";
import { BallRating } from "../../components/BallRating";
import { ErrorBox } from "../../components/ui/ErrorBox";
import type { PeladaDetail } from "../../types";

interface Props {
  detail: PeladaDetail;
}

export function MembersTab({ detail }: Props) {
  const { pelada, myRole, members } = detail;
  const [copied, setCopied] = useState(false);
  const ratingRound = useTriggerRatingRound(pelada.id);
  const isManager = myRole === "manager";
  const inviteUrl = `${window.location.origin}/invite/${pelada.inviteToken}`;
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const triggerRound = () => {
    closeConfirm();
    ratingRound.mutate();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Stack gap="md">
      {isManager && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Title order={3} size="lg">
            Convite
          </Title>
          <Group gap="sm" mt="sm">
            <Text ff="monospace" size="sm" style={{ wordBreak: "break-all" }}>
              {inviteUrl}
            </Text>
            <CopyButton value={inviteUrl}>
              {({ copied: c, copy: cp }) => (
                <Button size="xs" variant="light" onClick={cp} leftSection={c ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                  {c ? "Copiado!" : "Copiar"}
                </Button>
              )}
            </CopyButton>
          </Group>

          <Title order={4} mt="lg">
            Avaliações
          </Title>
          <Text c="dimmed" size="sm" mb="sm">
            Dispara uma nova rodada geral: todos reavaliam todos e as novas notas substituem as antigas.
          </Text>
          <Button onClick={openConfirm}>
            Nova rodada de avaliações
          </Button>
          {ratingRound.isError && (
            <Box mt="sm">
              <ErrorBox error={ratingRound.error} />
            </Box>
          )}
        </Card>
      )}

      <Modal
        opened={confirmOpen}
        onClose={closeConfirm}
        title="Disparar nova rodada de avaliações?"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Todos os <b>{members.length} membros</b> serão notificados para reavaliar{" "}
            <b>todos os jogadores</b> da pelada de 1 a 5 bolas.
          </Text>
          <Text size="sm" c="dimmed">
            As novas notas vão <b>substituir as notas atuais</b> na média usada para o sorteio
            balanceado dos times.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="light" color="gray" onClick={closeConfirm}>
              Cancelar
            </Button>
            <Button
              color="grass"
              loading={ratingRound.isPending}
              onClick={triggerRound}
            >
              Tenho certeza, disparar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Title order={3} size="lg" mb="sm">
          Membros ({members.length}/50)
        </Title>
        <Stack gap={6}>
          {members.map((m) => (
            <Group key={m.userId} justify="space-between" px="xs" py={6} style={{ borderRadius: 8 }}>
              <Group gap="sm">
                <Text>{m.name}</Text>
                {m.position === "keeper" && (
                  <Badge color="yellow" variant="light" size="xs">
                    🧤 goleiro
                  </Badge>
                )}
                {m.isManager && (
                  <Badge color="yellow" variant="light">
                    manager
                  </Badge>
                )}
              </Group>
              <Group gap={6}>
                <BallRating value={m.avgRating} readOnly size={20} fractions={2} position={m.position} />
                <Text c="dimmed" size="sm">
                  {m.avgRating.toFixed(1)}
                </Text>
              </Group>
            </Group>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
