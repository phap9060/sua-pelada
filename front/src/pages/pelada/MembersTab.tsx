import { useState } from "react";
import { Badge, Button, Card, CopyButton, Group, Menu, Modal, Stack, Text, Title, ActionIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconCopy, IconDots, IconShieldCheck, IconUserMinus } from "@tabler/icons-react";
import { useAppointAssistant, useRemoveAssistant, useTriggerRatingRound } from "../../hooks/usePelada";
import { BallRating } from "../../components/BallRating";
import { PlayerRow } from "../../components/ui/PlayerRow";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorBox } from "../../components/ui/ErrorBox";
import type { PeladaDetail as PeladaDetailData } from "../../types";

interface Props {
  detail: PeladaDetailData;
}

const MAX_ASSISTANTS = 3;

export function MembersTab({ detail }: Props) {
  const { pelada, myRole, members } = detail;
  const ratingRound = useTriggerRatingRound(pelada.id);
  const appoint = useAppointAssistant(pelada.id);
  const remove = useRemoveAssistant(pelada.id);
  const isManager = myRole === "manager";
  const canManage = myRole !== "member";
  const inviteUrl = `${window.location.origin}/invite/${pelada.inviteToken}`;
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const assistantCount = members.filter((m) => m.role === "assistant").length;
  const atLimit = assistantCount >= MAX_ASSISTANTS;

  const triggerRound = () => {
    closeConfirm();
    ratingRound.mutate();
  };

  return (
    <Stack gap="md">
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Title order={3} size="lg" mb="sm">
          Membros ({members.length}/50)
        </Title>
        {members.length === 0 ? (
          <EmptyState title="Nenhum membro ainda" hint="Compartilhe o link de convite para a turma entrar." />
        ) : (
          <Stack gap={0}>
            {members.map((m) => (
              <PlayerRow
                key={m.userId}
                name={m.name}
                position={m.position}
                trailing={
                  <Group gap="xs" wrap="nowrap">
                    {isManager && (
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={`Ações para ${m.name}`}>
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {m.role === "assistant" ? (
                            <>
                              <Menu.Label>Cargo: auxiliar</Menu.Label>
                              <Menu.Item
                                color="red"
                                leftSection={<IconUserMinus size={15} />}
                                disabled={remove.isPending}
                                onClick={() => remove.mutate(m.userId)}
                              >
                                Remover cargo
                              </Menu.Item>
                            </>
                          ) : (
                            <Menu.Item
                              leftSection={<IconShieldCheck size={15} />}
                              disabled={atLimit || appoint.isPending}
                              onClick={() => appoint.mutate(m.userId)}
                            >
                              {atLimit ? "Limite de 3 auxiliares atingido" : "Nomear auxiliar"}
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    )}
                    <Group gap="xs" wrap="nowrap" style={{ flex: "none" }}>
                      <BallRating value={m.avgRating} readOnly size={16} fractions={2} position={m.position} />
                      <Text c="dimmed" size="sm" className="digits" w={26} ta="right">
                        {m.avgRating.toFixed(1)}
                      </Text>
                    </Group>
                  </Group>
                }
              >
                {m.role === "manager" && (
                  <Badge color="refletor" variant="light" size="xs">
                    manager
                  </Badge>
                )}
                {m.role === "assistant" && (
                  <Badge color="grass" variant="light" size="xs">
                    auxiliar
                  </Badge>
                )}
              </PlayerRow>
            ))}
          </Stack>
        )}
        {isManager && (
          <Text c="dimmed" size="xs" mt="sm">
            Auxiliares ({assistantCount}/{MAX_ASSISTANTS}): podem consagrar campeões, editar a pelada e disparar rodadas de avaliação.
          </Text>
        )}
        {appoint.isError && <ErrorBox error={appoint.error} />}
      </Card>

      {canManage && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Title order={4}>Convite</Title>
          <Text c="dimmed" size="sm" mb="sm">
            Quem recebe este link entra direto na pelada.
          </Text>
          <Group gap="sm" align="center">
            <Text ff="monospace" size="xs" style={{ wordBreak: "break-all", flex: 1 }}>
              {inviteUrl}
            </Text>
            <CopyButton value={inviteUrl}>
              {({ copied, copy }) => (
                <Button
                  size="compact-sm"
                  variant="light"
                  onClick={copy}
                  leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                >
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              )}
            </CopyButton>
          </Group>

          <hr className="chalk-rule" style={{ margin: "18px 0" }} />

          <Title order={4}>Avaliações</Title>
          <Text c="dimmed" size="sm" mb="sm">
            Dispara uma nova rodada geral: todos reavaliam todos e as novas notas substituem as antigas.
          </Text>
          <Button onClick={openConfirm} variant="light">
            Nova rodada de avaliações
          </Button>
          {ratingRound.isError && <ErrorBox error={ratingRound.error} />}
        </Card>
      )}

      <Modal opened={confirmOpen} onClose={closeConfirm} title="Disparar nova rodada de avaliações?" centered>
        <Stack gap="md">
          <Text size="sm">
            Todos os <b>{members.length} membros</b> serão notificados para reavaliar{" "}
            <b>todos os jogadores</b> da pelada de 1 a 5 bolas.
          </Text>
          <Text size="sm" c="dimmed">
            As novas notas vão <b>substituir as notas atuais</b> na média usada para o sorteio balanceado dos times.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="light" color="gray" onClick={closeConfirm}>
              Cancelar
            </Button>
            <Button color="grass" loading={ratingRound.isPending} onClick={triggerRound}>
              Tenho certeza, disparar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
