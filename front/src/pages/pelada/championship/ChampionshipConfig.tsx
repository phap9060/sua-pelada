import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  MultiSelect,
  NumberInput,
  Radio,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowDown, IconArrowUp, IconFlag, IconTrophy } from "@tabler/icons-react";
import {
  useCancelChampionship,
  useCaptainRatingRound,
  useCreateChampionship,
  useStartDraft,
  useUpdateChampionship,
} from "../../../hooks/useChampionship";
import { PlayerDot } from "../../../components/ui/PlayerRow";
import { ErrorBox } from "../../../components/ui/ErrorBox";
import { ConfirmButton } from "../../../components/ui/ConfirmButton";
import type { ChampionshipPayload, PeladaDetail } from "../../../types";

interface Props {
  detail: PeladaDetail;
  champ: ChampionshipPayload | null;
}

const powersOfTwoUpTo = (max: number) => {
  const options: number[] = [];
  for (let v = 2; v < max; v *= 2) options.push(v);
  return options;
};

/** Tela de configurações: modo, times/capitães, level base, classificados e serpentina. */
export function ChampionshipConfig({ detail, champ }: Props) {
  const isEdit = champ !== null && champ.status === "config";
  const create = useCreateChampionship(detail.pelada.id);
  const update = useUpdateChampionship(champ?.id ?? "");
  const startDraft = useStartDraft(champ?.id ?? "");
  const cancel = useCancelChampionship(champ?.id ?? "");
  const captainRound = useCaptainRatingRound(champ?.id ?? "");
  const [captainRoundSent, setCaptainRoundSent] = useState(false);

  const [name, setName] = useState(champ?.name ?? "");
  const [teamCount, setTeamCount] = useState<number>(champ?.teamCount ?? 4);
  const [captainIds, setCaptainIds] = useState<string[]>(champ?.teams.map((t) => t.captain.id) ?? []);
  const [levelBasis, setLevelBasis] = useState<"pelada" | "captains">(champ?.levelBasis ?? "pelada");
  const [qualifiers, setQualifiers] = useState<number>(champ?.qualifiersCount ?? 2);
  const [snake, setSnake] = useState(champ?.snakeDraft ?? true);

  const memberOptions = detail.members.map((m) => ({ value: m.userId, label: m.name }));
  const memberNameById = new Map(detail.members.map((m) => [m.userId, m.name]));

  const qualifiersOptions = powersOfTwoUpTo(teamCount).map((v) => ({ value: String(v), label: `${v} times` }));
  const captainsComplete = captainIds.length === teamCount;
  const qualifiersValid = qualifiers < teamCount && qualifiers >= 2;

  const reorder = (index: number, dir: -1 | 1) => {
    setCaptainIds((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const moveCaptain = (userId: string, dir: -1 | 1) => reorder(captainIds.indexOf(userId), dir);

  const submit = () => {
    if (name.trim().length === 0) return;
    if (!captainsComplete) return;
    const body = {
      name: name.trim(),
      teamCount,
      captainIds,
      levelBasis,
      qualifiersCount: qualifiers,
      snakeDraft: snake,
      mode: "draft" as const,
    };
    if (isEdit && champ) {
      update.mutate(
        {
          name: body.name,
          levelBasis: body.levelBasis,
          qualifiersCount: body.qualifiersCount,
          snakeDraft: body.snakeDraft,
        },
        { onSuccess: () => notifications.show({ title: "Configuração salva", message: "Tudo pronto para iniciar o draft.", color: "grass" }) }
      );
    } else {
      create.mutate(body);
    }
  };

  return (
    <Stack gap="md" maw={680}>
      {isEdit && champ && <OptInsPanel champ={champ} />}

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Group gap="xs" mb="sm">
          <IconTrophy size={20} stroke={1.8} style={{ color: "var(--mantine-color-refletor-5)" }} />
          <Text fw={700} size="lg">
            {isEdit ? "Configuração do campeonato" : "Criar campeonato"}
          </Text>
        </Group>

        {create.error != null && <ErrorBox error={create.error} />}
        {update.error != null && <ErrorBox error={update.error} />}

        <Stack gap="md">
          <TextInput
            label="Nome do campeonato"
            placeholder="Copa da Pelada"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.currentTarget.value)}
          />

          <Stack gap={4}>
            <Text size="sm" fw={700}>
              Modo do campeonato
            </Text>
            <Group gap="xs" align="center">
              <Button variant="filled" color="grass" size="sm" disabled>
                Draft
              </Button>
              <Button
                variant="light"
                color="terra"
                size="sm"
                onClick={() =>
                  notifications.show({
                    title: "Modo sorteio",
                    message: "O sorteio automático estará disponível em breve.",
                    color: "yellow",
                  })
                }
              >
                Sorteio
              </Button>
              <Text size="xs" c="dimmed">
                o sorteio sai em breve
              </Text>
            </Group>
          </Stack>

          {!isEdit && (
            <NumberInput
              label="Quantidade de times"
              min={3}
              max={16}
              value={teamCount}
              onChange={(v) => {
                const n = Number(v) || 3;
                setTeamCount(n);
                if (qualifiers >= n) setQualifiers(powersOfTwoUpTo(n)[0] ?? 2);
              }}
              maw={200}
            />
          )}

          <Stack gap={4}>
            <Text size="sm" fw={700}>
              Capitães ({captainIds.length}/{teamCount})
            </Text>
            <MultiSelect
              placeholder="Escolha um capitão por time"
              data={memberOptions}
              value={captainIds}
              searchable
              onChange={(values) => setCaptainIds(values)}
              disabled={isEdit}
            />
            {captainIds.length > 0 && !isEdit && (
              <Text size="xs" c={captainsComplete ? "dimmed" : "red"}>
                {captainsComplete ? "Ordem base (pior level primeiro — arraste para mudar):" : `Faltam ${teamCount - captainIds.length} capitão(ões)`}
              </Text>
            )}
            <Stack gap={4}>
              {captainIds.map((userId, i) => (
                <Group key={userId} justify="space-between" wrap="nowrap" px="xs" py={4} style={{ borderRadius: 10, border: "1px solid var(--sp-chalk-faint)" }}>
                  <Group gap="sm" wrap="nowrap">
                    <Text className="digits" fw={700} size="xs" c="dimmed">
                      {i + 1}º
                    </Text>
                    <PlayerDot name={memberNameById.get(userId) ?? "?"} />
                    <Text size="sm" fw={600} truncate maw={200}>
                      {memberNameById.get(userId) ?? "?"}
                    </Text>
                  </Group>
                  {!isEdit && (
                    <Group gap={2} wrap="nowrap">
                      <ActionIcon size="xs" variant="subtle" color="gray" disabled={i === 0} onClick={() => moveCaptain(userId, -1)}>
                        <IconArrowUp size={12} />
                      </ActionIcon>
                      <ActionIcon size="xs" variant="subtle" color="gray" disabled={i === captainIds.length - 1} onClick={() => moveCaptain(userId, 1)}>
                        <IconArrowDown size={12} />
                      </ActionIcon>
                    </Group>
                  )}
                </Group>
              ))}
            </Stack>
          </Stack>

          <Stack gap={6}>
            <Text size="sm" fw={700}>
              Level dos jogadores no draft
            </Text>
            <Radio.Group value={levelBasis} onChange={(v) => setLevelBasis(v as "pelada" | "captains")}>
              <Group gap="lg" mt={4}>
                <Radio value="pelada" label="Média da pelada" />
                <Radio value="captains" label="Usar nota dos capitães" />
              </Group>
            </Radio.Group>
            {levelBasis === "captains" && (
              <>
                <Text size="xs" c="dimmed">
                  Usa as notas que os capitães escolhidos já deram na pelada; sem nota, cai para a média da pelada.
                </Text>
                {isEdit && champ && (
                  <Group align="flex-start" wrap="nowrap" px="xs" py={8} style={{ borderRadius: 10, border: "1px solid var(--sp-chalk-faint)" }}>
                    <Switch
                      label="Nova rodada de avaliação apenas para os capitães?"
                      description="Envia uma tarefa de avaliação só para eles; o draft já abre com as notas novas."
                      checked={captainRoundSent}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          captainRound.mutate(undefined, {
                            onSuccess: () => {
                              setCaptainRoundSent(true);
                              notifications.show({
                                title: "Rodada enviada aos capitães",
                                message: "O draft vai usar as notas atualizadas deles.",
                                color: "grass",
                              });
                            },
                          });
                        } else {
                          setCaptainRoundSent(false);
                        }
                      }}
                    />
                  </Group>
                )}
                {captainRound.error != null && <ErrorBox error={captainRound.error} />}
              </>
            )}
          </Stack>

          <Group grow align="flex-end">
            <Select
              label="Classificados para o mata-mata"
              data={qualifiersOptions}
              value={String(qualifiers)}
              onChange={(v) => setQualifiers(Number(v) || 2)}
            />
            <Switch
              label="Ordem serpentina"
              description="1-2-3-3-2-1 entre as rodadas de escolha"
              checked={snake}
              onChange={(e) => setSnake(e.currentTarget.checked)}
              mt="sm"
            />
          </Group>

          <Button
            color="grass"
            size="md"
            disabled={name.trim().length === 0 || !captainsComplete || !qualifiersValid}
            loading={create.isPending || update.isPending}
            onClick={submit}
          >
            {isEdit ? "Salvar configuração" : "Criar campeonato"}
          </Button>
        </Stack>
      </Card>

      {isEdit && champ && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={2}>
              <Group gap="xs">
                <IconFlag size={16} style={{ color: "var(--mantine-color-grass-5)" }} />
                <Text fw={700}>Pronto para começar?</Text>
              </Group>
              <Text size="sm" c="dimmed">
                Iniciar o draft congela o pool: quem confirmou presença até ali entra.
              </Text>
            </Stack>
            <Button color="grass" onClick={() => startDraft.mutate()} loading={startDraft.isPending}>
              Iniciar draft
            </Button>
          </Group>
          {startDraft.error != null && <ErrorBox error={startDraft.error} />}
          {cancel.error != null && <ErrorBox error={cancel.error} />}
          <Group justify="flex-end" mt="md">
            <ConfirmButton
              title="Cancelar campeonato?"
              message="A configuração atual e as confirmações de presença serão arquivadas como cancelado. Não dá para desfazer."
              confirmLabel="Cancelar campeonato"
              confirmColor="red"
              variant="subtle"
              color="red"
              size="compact-sm"
              loading={cancel.isPending}
              onConfirm={() => cancel.mutate()}
            >
              Cancelar campeonato
            </ConfirmButton>
          </Group>
        </Card>
      )}
    </Stack>
  );
}

/** Pool de presenças confirmadas enquanto o draft não começa. */
function OptInsPanel({ champ }: { champ: ChampionshipPayload }) {
  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Text fw={700} size="lg">
          Presenças confirmadas
        </Text>
        <Badge size="sm" color="grass" variant="light">
          {champ.pool.length} no pool
        </Badge>
      </Group>
      {champ.pool.length === 0 && (
        <Text c="dimmed" size="sm">
          Ninguém confirmou presença ainda — os membros confirmam na aba Campeonato.
        </Text>
      )}
      <Group gap={6} wrap="wrap">
        {champ.pool.map((p) => (
          <Group key={p.userId} gap={6} wrap="nowrap" px="xs" py={2} style={{ borderRadius: 999, border: "1px solid var(--sp-chalk-faint)" }}>
            <PlayerDot name={p.name} position={p.position} />
            <Text size="xs" fw={600}>
              {p.name}
            </Text>
          </Group>
        ))}
      </Group>
    </Card>
  );
}
