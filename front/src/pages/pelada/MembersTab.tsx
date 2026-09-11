import { useState } from "react";
import { Badge, Button, Card, CopyButton, Group, Menu, Modal, Stack, Text, TextInput, Title, ActionIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useOutletContext } from "react-router-dom";
import { IconCheck, IconCopy, IconDots, IconLogout, IconSearch, IconShieldCheck, IconUserMinus, IconUserOff } from "@tabler/icons-react";
import {
  useAppointAssistant,
  useLeavePelada,
  useRemoveAssistant,
  useRemoveMember,
  useTriggerRatingRound,
} from "../../hooks/usePelada";
import { useAuth } from "../../hooks/useAuth";
import { BallRating } from "../../components/BallRating";
import { PlayerRow } from "../../components/ui/PlayerRow";
import { FieldPositionBadge } from "../../components/ui/FieldPositionBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { fmtDateTime } from "../../utils/date";
import type { PeladaOutletContext } from "./PeladaDetail";

const MAX_ASSISTANTS = 3;

export function MembersTab() {
  const { detail } = useOutletContext<PeladaOutletContext>();
  const { pelada, myRole, members, exits } = detail;
  const { user } = useAuth();
  const myUserId = user?.id;
  const ratingRound = useTriggerRatingRound(pelada.id);
  const appoint = useAppointAssistant(pelada.id);
  const removeAssistant = useRemoveAssistant(pelada.id);
  const removeMember = useRemoveMember(pelada.id);
  const leave = useLeavePelada(pelada.id);
  const isManager = myRole === "manager";
  const canManage = myRole !== "member";
  const inviteUrl = `${window.location.origin}/invite/${pelada.inviteToken}`;
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [leaveOpen, { open: openLeave, close: closeLeave }] = useDisclosure(false);
  const [removeTarget, setRemoveTarget] = useState<(typeof members)[number] | null>(null);
  const [filter, setFilter] = useState("");

  const assistantCount = members.filter((m) => m.role === "assistant").length;
  const atLimit = assistantCount >= MAX_ASSISTANTS;

  // filtro por nome + ordem: o próprio usuário sempre primeiro; quando quem vê
  // é o manager, os auxiliares vêm logo abaixo dele; o resto em ordem alfabética
  const norm = filter.trim().toLowerCase();
  const visible = norm ? members.filter((m) => m.name.toLowerCase().includes(norm)) : members;
  const byName = (a: (typeof members)[number], b: (typeof members)[number]) => a.name.localeCompare(b.name, "pt-BR");
  const self = visible.filter((m) => m.userId === myUserId);
  const rest = visible.filter((m) => m.userId !== myUserId).sort(byName);
  const assistantRows = isManager ? rest.filter((m) => m.role === "assistant") : [];
  const otherRows = isManager ? rest.filter((m) => m.role !== "assistant") : rest;
  const orderedMembers = [...self, ...assistantRows, ...otherRows];

  const triggerRound = () => {
    closeConfirm();
    ratingRound.mutate();
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    removeMember.mutate(removeTarget.userId);
    setRemoveTarget(null);
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
          <>
            {members.length > 1 && (
              <TextInput
                placeholder="Filtrar por nome"
                leftSection={<IconSearch size={15} />}
                value={filter}
                onChange={(e) => setFilter(e.currentTarget.value)}
                mb="sm"
              />
            )}
            {orderedMembers.length === 0 ? (
              <EmptyState title="Nenhum membro encontrado" hint="Ninguém com esse nome na pelada." />
            ) : (
              <Stack gap={0}>
                {orderedMembers.map((m) => (
                  <PlayerRow
                    key={m.userId}
                    name={m.name}
                    position={m.position}
                    className="member-row"
                    trailing={
                  <Group gap="xs" wrap="nowrap">
                    {m.userId === pelada.managerId ? (
                      <Badge color="refletor" variant="light" size="xs">
                        manager
                      </Badge>
                    ) : m.userId === myUserId ? (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        aria-label="Sair da pelada"
                        disabled={leave.isPending}
                        onClick={openLeave}
                      >
                        <IconLogout size={16} />
                      </ActionIcon>
                    ) : canManage && (
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={`Ações para ${m.name}`}>
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {isManager &&
                            (m.role === "assistant" ? (
                              <>
                                <Menu.Label>Cargo: auxiliar</Menu.Label>
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconUserMinus size={15} />}
                                  disabled={removeAssistant.isPending}
                                  onClick={() => removeAssistant.mutate(m.userId)}
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
                            ))}
                          <Menu.Item
                            color="red"
                            leftSection={<IconUserOff size={15} />}
                            disabled={removeMember.isPending}
                            onClick={() => setRemoveTarget(m)}
                          >
                            Remover da pelada
                          </Menu.Item>
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
                <FieldPositionBadge primary={m.fieldPosition} secondary={m.fieldPositionSecondary} position={m.position} />
                {m.role === "assistant" && (
                  <Badge color="grass" variant="light" size="xs">
                    auxiliar
                  </Badge>
                )}
              </PlayerRow>
            ))}
              </Stack>
            )}
          </>
        )}
        {isManager && (
          <Text c="dimmed" size="xs" mt="sm">
            Auxiliares ({assistantCount}/{MAX_ASSISTANTS}): podem consagrar campeões, editar a pelada, disparar rodadas de avaliação e remover jogadores da lista.
          </Text>
        )}
        {canManage && (
          <Text c="dimmed" size="xs" mt="sm">
            Removidos podem voltar pela lista de convite.
          </Text>
        )}
        {removeMember.isError && <ErrorBox error={removeMember.error} />}
        {leave.isError && <ErrorBox error={leave.error} />}
      </Card>

      {exits.length > 0 && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Title order={3} size="lg" mb="sm">
            Jogadores que desistiram ({exits.length})
          </Title>
          <Stack gap={0}>
            {exits.map((e) => (
              <PlayerRow
                key={e.userId}
                name={e.name}
                trailing={
                  <Text c="dimmed" size="xs">
                    Saiu em {fmtDateTime(e.exitedAt)}
                  </Text>
                }
              />
            ))}
          </Stack>
        </Card>
      )}

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

      <Modal
        opened={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title={`Remover ${removeTarget?.name ?? "jogador"} da pelada?`}
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            <b>{removeTarget?.name}</b> sai da lista de membros, perde as notas e não poderá confirmar o próximo
            jogo.
          </Text>
          <Text size="sm" c="dimmed">
            Ele pode voltar pelo link de convite quando quiser.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="light" color="gray" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={removeMember.isPending} onClick={confirmRemove}>
              Remover da pelada
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={leaveOpen} onClose={closeLeave} title="Sair da pelada?" centered>
        <Stack gap="md">
          <Text size="sm">
            Você sai da lista de membros, perde as notas e não poderá confirmar o próximo jogo.
          </Text>
          <Text size="sm" c="dimmed">
            Pode voltar pelo link de convite quando quiser.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="light" color="gray" onClick={closeLeave}>
              Cancelar
            </Button>
            <Button color="red" loading={leave.isPending} onClick={() => leave.mutate()}>
              Sair da pelada
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}