import { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { IconBallFootball, IconPencil, IconRefresh, IconShoe, IconSwords, IconTrophy } from "@tabler/icons-react";
import {
  useCancelChampionship,
  useFinalizeRound,
  useGenerateKnockout,
  useRenameTeam,
  useReplacePlayer,
} from "../../../hooks/useChampionship";
import { PlayerDot } from "../../../components/ui/PlayerRow";
import { ErrorBox } from "../../../components/ui/ErrorBox";
import { ConfirmButton } from "../../../components/ui/ConfirmButton";
import { ResultModal } from "./ResultModal";
import type { ChampionshipMatch, ChampionshipPayload, ChampionshipTeam } from "../../../types";

interface Props {
  champ: ChampionshipPayload;
  canManage: boolean;
  myUserId: string;
}

/** Fase de grupos: classificação, todas as rodadas e lançamento de resultados. */
export function GroupsBoard({ champ, canManage, myUserId }: Props) {
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<ChampionshipTeam | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [replacing, setReplacing] = useState<{ team: ChampionshipTeam; userId: string; playerName: string } | null>(null);
  const [replaceChoice, setReplaceChoice] = useState<string | null>(null);

  const finalizeRound = useFinalizeRound(champ.id);
  const generate = useGenerateKnockout(champ.id);
  const rename = useRenameTeam(champ.id);
  const replace = useReplacePlayer(champ.id);
  const cancelChamp = useCancelChampionship(champ.id);

  const teamById = useMemo(() => new Map(champ.teams.map((t) => [t.id, t])), [champ.teams]);
  const groupMatches = champ.matches.filter((m) => m.stage === "group");
  const maxRound = Math.max(0, ...groupMatches.map((m) => m.round));
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);
  const roundComplete = (r: number) =>
    groupMatches.filter((m) => m.round === r).every((m) => m.homeScore !== null && m.awayScore !== null);
  const allRoundsComplete = rounds.every(roundComplete);

  const resultMatch = resultMatchId ? champ.matches.find((m) => m.id === resultMatchId) ?? null : null;
  const substitutes = champ.pool.filter((p) => !p.picked);

  return (
    <Stack gap="md">
      {canManage && (
        <Card shadow="sm" padding="md" radius="lg" withBorder>
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" c="dimmed">
              Fase de grupos em andamento · {champ.qualifiersCount} classificados para o mata-mata
            </Text>
            <Group gap="xs">
              <Button
                size="compact-sm"
                variant="light"
                color="grass"
                disabled={!allRoundsComplete}
                onClick={() => generate.mutate()}
                loading={generate.isPending}
              >
                Gerar mata-mata
              </Button>
              <ConfirmButton
                title="Cancelar campeonato?"
                message="Todos os jogos, times e estatísticas deste campeonato serão arquivados como cancelado. Não dá para desfazer."
                confirmLabel="Cancelar campeonato"
                confirmColor="red"
                size="compact-sm"
                variant="subtle"
                color="red"
                loading={cancelChamp.isPending}
                onConfirm={() => cancelChamp.mutate()}
              >
                Cancelar campeonato
              </ConfirmButton>
            </Group>
          </Group>
          {generate.error != null && <ErrorBox error={generate.error} />}
        </Card>
      )}

      <StandingsTable
        champ={champ}
        myTeamId={champ.teams.find((t) => t.captain.id === myUserId)?.id}
        canManage={canManage}
        onRename={(team, current) => {
          setRenaming(team);
          setRenameValue(current);
        }}
      />

      <Stack gap="sm">
        {rounds.map((r) => (
          <Card key={r} shadow="sm" padding="lg" radius="lg" withBorder>
            <Group justify="space-between" mb="sm" wrap="nowrap">
              <Text className="eyebrow" size="xs" c="dimmed">
                Rodada {r}
              </Text>
              {canManage && (
                <Button
                  size="compact-xs"
                  variant="light"
                  color="grass"
                  disabled={!roundComplete(r)}
                  onClick={() => finalizeRound.mutate(r)}
                  loading={finalizeRound.isPending && finalizeRound.variables === r}
                >
                  Finalizar rodada
                </Button>
              )}
            </Group>
            <Stack gap={2}>
              {groupMatches
                .filter((m) => m.round === r)
                .map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    home={teamById.get(m.homeTeamId)}
                    away={teamById.get(m.awayTeamId)}
                    canManage={canManage}
                    onOpenResult={() => setResultMatchId(m.id)}
                  />
                ))}
            </Stack>
          </Card>
        ))}
      </Stack>

      {canManage && <TeamsAdminCard champ={champ} myUserId={myUserId} onRename={(t, v) => { setRenaming(t); setRenameValue(v); }} onReplace={setReplacing} />}

      {resultMatch && (
        <ResultModal
          championshipId={champ.id}
          match={resultMatch}
          home={teamById.get(resultMatch.homeTeamId)!}
          away={teamById.get(resultMatch.awayTeamId)!}
          opened
          onClose={() => setResultMatchId(null)}
        />
      )}

      <Modal opened={renaming !== null} onClose={() => setRenaming(null)} title="Renomear time" centered size="sm">
        <Stack gap="sm">
          <TextInput
            label="Nome do time"
            value={renameValue}
            maxLength={40}
            onChange={(e) => setRenameValue(e.currentTarget.value)}
            data-autofocus
          />
          {rename.error != null && <ErrorBox error={rename.error} />}
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button
              color="grass"
              loading={rename.isPending}
              disabled={renameValue.trim().length === 0}
              onClick={() =>
                renaming && rename.mutate({ teamId: renaming.id, name: renameValue.trim() }, { onSuccess: () => setRenaming(null) })
              }
            >
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={replacing !== null} onClose={() => setReplacing(null)} title="Repor jogador" centered size="sm">
        <Stack gap="sm">
          <Text size="sm">
            Sair: <strong>{replacing?.playerName}</strong> — escolha o substituto entre quem ficou de fora do draft.
          </Text>
          <Select
            placeholder="Substituto"
            data={substitutes.map((p) => ({ value: p.userId, label: p.name }))}
            value={replaceChoice}
            onChange={setReplaceChoice}
            searchable
          />
          {replace.error != null && <ErrorBox error={replace.error} />}
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setReplacing(null)}>
              Cancelar
            </Button>
            <Button
              color="grass"
              loading={replace.isPending}
              disabled={!replaceChoice || !replacing}
              onClick={() =>
                replacing &&
                replaceChoice &&
                replace.mutate({ teamId: replacing.team.id, fromUserId: replacing.userId, toUserId: replaceChoice }, { onSuccess: () => { setReplacing(null); setReplaceChoice(null); } })
              }
            >
              Repor
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

/** Classificação com desempate e linha de classificação destacada. */
function StandingsTable({
  champ,
  myTeamId,
  canManage,
  onRename,
}: {
  champ: ChampionshipPayload;
  myTeamId?: string;
  canManage: boolean;
  onRename: (team: ChampionshipTeam, currentName: string) => void;
}) {
  const qualifiedCut = champ.qualifiersCount;
  const canRename = (teamId: string) => canManage || teamId === myTeamId;
  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group gap="xs" mb="sm">
        <IconTrophy size={18} stroke={1.8} style={{ color: "var(--mantine-color-refletor-5)" }} />
        <Text fw={700} size="lg">
          Classificação
        </Text>
        <Badge size="sm" variant="light" c="dimmed">
          {champ.qualifiersCount} avançam
        </Badge>
      </Group>
      <Table.ScrollContainer minWidth={420}>
        <Table horizontalSpacing="xs" verticalSpacing={6} fz="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>Time</Table.Th>
            <Table.Th ta="center">P</Table.Th>
            <Table.Th ta="center">J</Table.Th>
            <Table.Th ta="center">V</Table.Th>
            <Table.Th ta="center">E</Table.Th>
            <Table.Th ta="center">D</Table.Th>
            <Table.Th ta="center">SG</Table.Th>
            <Table.Th ta="center">GP</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {champ.standings.map((s, i) => (
            <Table.Tr
              key={s.teamId}
              style={i < qualifiedCut ? { background: "rgba(34,197,94,0.08)", boxShadow: "inset 3px 0 0 var(--mantine-color-grass-5)" } : undefined}
            >
              <Table.Td>
                <Group gap={6} wrap="nowrap">
                  <Text className="digits" fw={700}>
                    {i + 1}
                  </Text>
                  {i < qualifiedCut && (
                    <Tooltip label="Zona de classificação">
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--mantine-color-grass-5)", display: "inline-block" }} />
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Group gap={4} wrap="nowrap">
                  <Text fw={700} truncate maw={180}>
                    {s.teamName}
                  </Text>
                  {canRename(s.teamId) && (
                    <Tooltip label="Renomear time">
                      <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => onRename(champ.teams.find((t) => t.id === s.teamId)!, s.teamName)}>
                        <IconPencil size={11} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
              <Table.Td ta="center" fw={800} className="digits">
                {s.points}
              </Table.Td>
              <Table.Td ta="center" className="digits">{s.played}</Table.Td>
              <Table.Td ta="center" className="digits">{s.wins}</Table.Td>
              <Table.Td ta="center" className="digits">{s.draws}</Table.Td>
              <Table.Td ta="center" className="digits">{s.losses}</Table.Td>
              <Table.Td ta="center" className="digits">{s.goalsDiff > 0 ? `+${s.goalsDiff}` : s.goalsDiff}</Table.Td>
              <Table.Td ta="center" className="digits">{s.goalsFor}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}

function MatchRow({
  match,
  home,
  away,
  canManage,
  onOpenResult,
}: {
  match: ChampionshipMatch;
  home?: ChampionshipTeam;
  away?: ChampionshipTeam;
  canManage: boolean;
  onOpenResult: () => void;
}) {
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const eventsByType = useMemo(() => {
    const goals = match.events.filter((e) => e.type === "goal");
    const assists = match.events.filter((e) => e.type === "assist");
    const yellows = match.events.filter((e) => e.type === "yellow");
    const reds = match.events.filter((e) => e.type === "red");
    const motm = match.events.find((e) => e.type === "motm");
    const count = (list: typeof goals, userId: string) => list.filter((e) => e.userId === userId).length;
    const summarize = (list: typeof goals) =>
      [...new Set(list.map((e) => e.userId))]
        .map((userId) => {
          const n = count(list, userId);
          return `${n > 1 ? `${n}x ` : ""}${list.find((e) => e.userId === userId)!.playerName}`;
        })
        .join(", ");
    return {
      goals: summarize(goals),
      assists: summarize(assists),
      yellows: summarize(yellows),
      reds: summarize(reds),
      motm,
      hasCards: yellows.length > 0 || reds.length > 0,
    };
  }, [match.events]);

  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="nowrap" px="xs" py={4} style={{ borderRadius: 10, background: hasResult ? "rgba(232,242,234,0.05)" : undefined }}>
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <Box visibleFrom="sm" style={{ display: "inline-flex", flex: "none" }}>
            <PlayerDot name={home?.name ?? "?"} />
          </Box>
          <Text size="sm" fw={700} truncate maw={{ base: 110, sm: 140 }}>
            {home?.name ?? "?"}
          </Text>
          <Text className="digits" fw={800} size="md">
            {match.homeScore ?? "-"}
          </Text>
          <Text size="sm" c="dimmed">
            x
          </Text>
          <Text className="digits" fw={800} size="md">
            {match.awayScore ?? "-"}
          </Text>
          <Text size="sm" fw={700} truncate maw={{ base: 110, sm: 140 }}>
            {away?.name ?? "?"}
          </Text>
          <Box visibleFrom="sm" style={{ display: "inline-flex", flex: "none" }}>
            <PlayerDot name={away?.name ?? "?"} />
          </Box>
          {match.homePenalties !== null && match.awayPenalties !== null && (
            <Badge size="xs" variant="light" color="terra">
              pên. {match.homePenalties}-{match.awayPenalties}
            </Badge>
          )}
        </Group>
        {canManage && (
          <Button size="compact-xs" variant={hasResult ? "subtle" : "light"} color="grass" onClick={onOpenResult}>
            {hasResult ? "Editar" : "Resultado"}
          </Button>
        )}
      </Group>
      {hasResult && (
        <Group gap="xs" px="xs" wrap="wrap">
          {eventsByType.goals && (
            <Text size="xs" c="dimmed">
              <IconBallFootball size={12} style={{ verticalAlign: -1 }} /> {eventsByType.goals}
            </Text>
          )}
          {eventsByType.assists && (
            <Text size="xs" c="dimmed">
              <IconShoe size={12} style={{ verticalAlign: -1 }} /> {eventsByType.assists}
            </Text>
          )}
          {eventsByType.hasCards && (
            <Text size="xs" c="dimmed">
              {eventsByType.yellows && (
                <span>
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "#e9c46a", marginRight: 3, verticalAlign: -1 }} />
                  {eventsByType.yellows}{" "}
                </span>
              )}
              {eventsByType.reds && (
                <span>
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "var(--mantine-color-red-6)", marginRight: 3, verticalAlign: -1 }} />
                  {eventsByType.reds}
                </span>
              )}
            </Text>
          )}
          {eventsByType.motm && (
            <Badge size="xs" color="refletor" variant="light" leftSection={<IconTrophy size={10} />}>
              MDJ {eventsByType.motm.playerName}
            </Badge>
          )}
        </Group>
      )}
    </Stack>
  );
}

/** Renomear/repor nos times (visível para admin/auxiliar). */
function TeamsAdminCard({
  champ,
  myUserId,
  onRename,
  onReplace,
}: {
  champ: ChampionshipPayload;
  myUserId: string;
  onRename: (team: ChampionshipTeam, currentName: string) => void;
  onReplace: (payload: { team: ChampionshipTeam; userId: string; playerName: string }) => void;
}) {
  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group gap="xs" mb="sm">
        <ThemeIcon variant="light" color="grass" size={26} radius="md">
          <IconSwords size={14} />
        </ThemeIcon>
        <Text fw={700} size="lg">
          Times do campeonato
        </Text>
      </Group>
      <Stack gap="sm">
        {champ.teams.map((team) => (
          <Stack key={team.id} gap={2}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <Text fw={800} size="md" truncate>
                  {team.name}
                </Text>
                <ActionIcon variant="subtle" color="gray" size="xs" onClick={() => onRename(team, team.name)}>
                  <IconPencil size={12} />
                </ActionIcon>
              </Group>
              <Badge size="sm" color="refletor" variant="light">
                capitão: {team.captain.name}
              </Badge>
            </Group>
            <Group gap={6} wrap="wrap">
              {team.players.map((p) => (
                <Group key={p.userId} gap={6} wrap="nowrap" px="xs" py={2} style={{ borderRadius: 999, border: "1px solid var(--sp-chalk-faint)" }}>
                  <PlayerDot name={p.name} position={p.position} />
                  <Text size="xs" fw={600}>
                    {p.name}
                  </Text>
                  {p.userId !== team.captain.id && (
                    <Tooltip label="Repor jogador">
                      <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => onReplace({ team, userId: p.userId, playerName: p.name })}>
                        <IconRefresh size={11} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              ))}
            </Group>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
