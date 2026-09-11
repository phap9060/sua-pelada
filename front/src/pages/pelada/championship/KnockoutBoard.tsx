import { useMemo, useState } from "react";
import { Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconCrown, IconSwords, IconTrophy } from "@tabler/icons-react";
import { useCancelChampionship } from "../../../hooks/useChampionship";
import { PlayerDot } from "../../../components/ui/PlayerRow";
import { ErrorBox } from "../../../components/ui/ErrorBox";
import { ConfirmButton } from "../../../components/ui/ConfirmButton";
import { ResultModal } from "./ResultModal";
import type { ChampionshipPayload, ChampionshipTeam } from "../../../types";

function roundLabel(round: number, teamsInRound: number): string {
  if (teamsInRound === 2) return "Final";
  if (teamsInRound === 4) return "Semifinais";
  return `Mata-mata ${round}`;
}

interface Props {
  champ: ChampionshipPayload;
  canManage: boolean;
}

/** Mata-mata: chave de confrontos, pênaltis e tela de campeão ao final. */
export function KnockoutBoard({ champ, canManage }: Props) {
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const cancelChamp = useCancelChampionship(champ.id);

  const teamById = useMemo(() => new Map(champ.teams.map((t) => [t.id, t])), [champ.teams]);
  const koMatches = champ.matches.filter((m) => m.stage === "knockout");
  const roundsSet = [...new Set(koMatches.map((m) => m.round))].sort((a, b) => a - b);
  const resultMatch = resultMatchId ? koMatches.find((m) => m.id === resultMatchId) ?? null : null;

  return (
    <Stack gap="md">
      {champ.champion && <ChampionBanner champ={champ} />}
      {canManage && champ.status === "knockout" && (
        <Card shadow="sm" padding="md" radius="lg" withBorder>
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" c="dimmed">
              Empate no mata-mata se decide nos pênaltis, indicados ao lançar o resultado.
            </Text>
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
        </Card>
      )}
      {cancelChamp.error != null && <ErrorBox error={cancelChamp.error} />}

      <Group align="flex-start" gap="md" wrap="nowrap" style={{ overflowX: "auto" }}>
        {roundsSet.map((r) => {
          const roundMatches = koMatches.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot);
          return (
            <Card key={r} shadow="sm" padding="lg" radius="lg" withBorder style={{ minWidth: 280, flex: 1 }}>
              <Group gap="xs" mb="sm">
                <IconSwords size={16} stroke={1.8} style={{ color: "var(--mantine-color-refletor-5)" }} />
                <Text fw={700} size="md">
                  {roundLabel(r, roundMatches.length * 2)}
                </Text>
              </Group>
              <Stack gap="sm">
                {roundMatches.map((m) => {
                  const home = teamById.get(m.homeTeamId);
                  const away = teamById.get(m.awayTeamId);
                  const hasResult = m.homeScore !== null && m.awayScore !== null;
                  return (
                    <Stack key={m.id} gap={6}>
                      <Group justify="space-between" wrap="nowrap">
                        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                          <Side teamName={home?.name ?? "?"} score={m.homeScore} penalties={m.homePenalties} winner={m.winnerTeamId === m.homeTeamId} />
                          <Side teamName={away?.name ?? "?"} penalties={m.awayPenalties} winner={m.winnerTeamId === m.awayTeamId} score={m.awayScore} />
                        </Stack>
                        {canManage && champ.status === "knockout" && (
                          <Button size="compact-xs" variant={hasResult ? "subtle" : "light"} color="grass" onClick={() => setResultMatchId(m.id)}>
                            {hasResult ? "Editar" : "Resultado"}
                          </Button>
                        )}
                      </Group>
                    </Stack>
                  );
                })}
              </Stack>
            </Card>
          );
        })}
      </Group>

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
    </Stack>
  );
}

function Side({ teamName, winner, penalties, score }: { teamName: string; winner: boolean; penalties?: number | null; score?: number | null }) {
  return (
    <Group gap="sm" wrap="nowrap" px="xs" py={4} style={{ borderRadius: 10, background: winner ? "rgba(34,197,94,0.08)" : undefined }}>
      <PlayerDot name={teamName} />
      <Text size="sm" fw={winner ? 800 : 600} truncate maw={150}>
        {teamName}
      </Text>
      <Text className="digits" fw={800} size="md" ml="auto">
        {score ?? "-"}
      </Text>
      {typeof penalties === "number" && (
        <Badge size="xs" variant="light" color="terra">
          pên. {penalties}
        </Badge>
      )}
      {winner && <IconCrown size={14} style={{ color: "var(--mantine-color-refletor-5)" }} />}
    </Group>
  );
}

/** Tela de campeão: título + time + capitão com o brilho âmbar do refletor. */
function ChampionBanner({ champ }: { champ: ChampionshipPayload }) {
  const leaders = champ.leaders;
  return (
    <Card shadow="sm" padding="xl" radius="lg" withBorder className="champion-glow">
      <Stack align="center" gap="xs" py="sm">
        <IconTrophy size={44} stroke={1.2} style={{ color: "var(--mantine-color-refletor-5)" }} />
        <Text className="eyebrow" c="dimmed" size="sm">
          {champ.name} · Campeão
        </Text>
        <Text className="display" fz={{ base: 30, sm: 40 }}>
          {champ.champion?.teamName ?? ""}
        </Text>
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            capitão:
          </Text>
          <Text size="sm" fw={700}>
            {champ.champion?.captain.name ?? ""}
          </Text>
        </Group>
      </Stack>
      <Group justify="center" gap="sm" wrap="wrap">
        <LeadersBadge label="Artilheiro" items={leaders.goals} />
        <LeadersBadge label="Garçom" items={leaders.assists} />
        <LeadersBadge label="Melhor do jogo" items={leaders.motm} />
      </Group>
    </Card>
  );
}

function LeadersBadge({ label, items }: { label: string; items: { userId: string; name: string; count: number }[] }) {
  if (items.length === 0) return null;
  return (
    <Badge color="refletor" variant="light" size="md">
      {label}: {items[0].name} ({items[0].count})
    </Badge>
  );
}
