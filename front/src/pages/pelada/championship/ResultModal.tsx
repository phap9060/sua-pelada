import { useMemo, useState } from "react";
import { Badge, Button, Group, Modal, NumberInput, SegmentedControl, Select, Stack, Text } from "@mantine/core";
import { usePostResult } from "../../../hooks/useChampionship";
import { ErrorBox } from "../../../components/ui/ErrorBox";
import type { ChampionshipMatch, ChampionshipTeam } from "../../../types";

type EventType = "goal" | "assist" | "yellow" | "red";
type Chip = { userId: string; playerName: string; type: EventType };

const TYPE_LABEL: Record<EventType, string> = {
  goal: "Gol",
  assist: "Assistência",
  yellow: "Amarelo",
  red: "Vermelho",
};

const toNum = (v: string | number) => (typeof v === "number" ? v : Number(v) || 0);

interface ResultModalProps {
  championshipId: string;
  match: ChampionshipMatch;
  home: ChampionshipTeam;
  away: ChampionshipTeam;
  opened: boolean;
  onClose: () => void;
}

/** Lança resultado + eventos (gols/assistências/cartões/melhor do jogo) de uma partida. */
export function ResultModal({ championshipId, match, home, away, opened, onClose }: ResultModalProps) {
  const post = usePostResult(championshipId);
  const existingMotm = match.events.find((e) => e.type === "motm");

  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0);
  const [chips, setChips] = useState<Chip[]>(
    match.events
      .filter((e) => e.type !== "motm")
      .map((e) => ({ userId: e.userId, playerName: e.playerName, type: e.type as EventType }))
  );
  const [motm, setMotm] = useState<string | null>(existingMotm?.userId ?? null);
  const [pickerUser, setPickerUser] = useState<string | null>(null);
  const [pickerType, setPickerType] = useState<EventType>("goal");
  const [penaltyWinner, setPenaltyWinner] = useState<string | null>(match.winnerTeamId ?? null);
  const [homePenalties, setHomePenalties] = useState(match.homePenalties ?? 0);
  const [awayPenalties, setAwayPenalties] = useState(match.awayPenalties ?? 0);

  const players = useMemo(
    () => [...home.players, ...away.players].map((p) => ({ value: p.userId, label: p.name })),
    [home, away]
  );
  const playerNameById = useMemo(() => new Map(players.map((p) => [p.value, p.label])), [players]);
  const drew = homeScore === awayScore;
  const isKnockout = match.stage === "knockout";

  const add = () => {
    if (!pickerUser) return;
    setChips((c) => [...c, { userId: pickerUser, playerName: playerNameById.get(pickerUser) ?? "?", type: pickerType }]);
    setPickerUser(null);
  };

  const submit = () => {
    const events = [
      ...chips.map(({ userId, type }) => ({ userId, type })),
      ...(motm ? [{ userId: motm, type: "motm" as const }] : []),
    ];
    post.mutate(
      {
        matchId: match.id,
        body: {
          homeScore,
          awayScore,
          events,
          ...(isKnockout && drew ? { winnerTeamId: penaltyWinner ?? undefined, homePenalties, awayPenalties } : {}),
        },
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Resultado · ${match.homeTeamName} x ${match.awayTeamName}`} centered>
      <Stack gap="sm">
        <Group justify="center" gap="sm" align="flex-end" wrap="nowrap">
          <Stack gap={4} align="center" style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={700} truncate style={{ maxWidth: 130 }}>
              {match.homeTeamName}
            </Text>
            <NumberInput value={homeScore} onChange={(v) => setHomeScore(toNum(v))} min={0} max={99} w={90} />
          </Stack>
          <Text size="xl" fw={800} pb={10}>
            x
          </Text>
          <Stack gap={4} align="center" style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={700} truncate style={{ maxWidth: 130 }}>
              {match.awayTeamName}
            </Text>
            <NumberInput value={awayScore} onChange={(v) => setAwayScore(toNum(v))} min={0} max={99} w={90} />
          </Stack>
        </Group>

        {isKnockout && drew && (
          <Stack gap={4}>
            <Text size="sm" fw={700}>
              Empate no mata-mata — decida nos pênaltis
            </Text>
            <Group gap="xs" align="flex-end" wrap="nowrap">
              <NumberInput label={match.homeTeamName} value={homePenalties} onChange={(v) => setHomePenalties(toNum(v))} min={0} max={99} style={{ flex: 1 }} />
              <NumberInput label={match.awayTeamName} value={awayPenalties} onChange={(v) => setAwayPenalties(toNum(v))} min={0} max={99} style={{ flex: 1 }} />
              <Select
                placeholder="Vencedor"
                data={[
                  { value: match.homeTeamId, label: match.homeTeamName },
                  { value: match.awayTeamId, label: match.awayTeamName },
                ]}
                value={penaltyWinner}
                onChange={(v) => setPenaltyWinner(v)}
                style={{ flex: 1 }}
              />
            </Group>
          </Stack>
        )}

        <Stack gap={6}>
          <Text size="sm" fw={700}>
            Eventos do jogo
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Select
              placeholder="Jogador"
              data={players}
              value={pickerUser}
              onChange={setPickerUser}
              searchable
              style={{ flex: 1 }}
            />
            <SegmentedControl
              value={pickerType}
              onChange={(v) => setPickerType(v as EventType)}
              data={[
                { value: "goal", label: "Gol" },
                { value: "assist", label: "Assist." },
                { value: "yellow", label: "Amarelo" },
                { value: "red", label: "Verm." },
              ]}
            />
            <Button variant="light" color="grass" onClick={add} disabled={!pickerUser}>
              +
            </Button>
          </Group>
          {chips.length > 0 && (
            <Group gap={6}>
              {chips.map((c, i) => (
                <Badge
                  key={`${c.userId}-${c.type}-${i}`}
                  color={c.type === "goal" ? "grass" : c.type === "red" ? "red" : "terra"}
                  variant="light"
                  onClick={() => setChips((list) => list.filter((_, j) => j !== i))}
                  style={{ cursor: "pointer" }}
                >
                  {c.playerName} · {TYPE_LABEL[c.type]} ×
                </Badge>
              ))}
            </Group>
          )}
          <Select
            label="Melhor do jogo"
            placeholder="Opcional"
            data={players}
            value={motm}
            onChange={(v) => setMotm(v)}
            searchable
            clearable
          />
        </Stack>

        {post.error != null && <ErrorBox error={post.error} />}
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button color="grass" loading={post.isPending} onClick={submit}>
            Salvar resultado
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
