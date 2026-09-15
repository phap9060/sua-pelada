import { useMemo, useState } from "react";
import { ActionIcon, Button, Card, Group, Select, Stack, Text, TextInput, Badge } from "@mantine/core";
import { IconTrash, IconUserPlus, IconShieldPlus } from "@tabler/icons-react";
import { PlayerRow } from "../ui/PlayerRow";
import { ConfirmButton } from "../ui/ConfirmButton";
import { ErrorBox } from "../ui/ErrorBox";
import type { GamePayload, PeladaDetail } from "../../types";
import type { EntryInput } from "../../services/games";

interface DraftEntry {
  userId?: string;
  name?: string;
  rating: number;
}

interface ExternalListCardProps {
  game: GamePayload;
  members: PeladaDetail["members"];
  canEdit: boolean;
  onSave: (line: EntryInput[], keepers: EntryInput[]) => void;
  onDraw: () => void;
  isSaving: boolean;
  isDrawing: boolean;
  error: unknown;
}

const RATING_OPTIONS = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];

function toDraftEntry(e: GamePayload["entries"][number]): DraftEntry {
  return e.userId ? { userId: e.userId, rating: e.rating } : { name: e.name, rating: e.rating };
}

/** Lista externa: admin digita quem vai jogar (membros + convidados) e sorteia os times. */
export function ExternalListCard({ game, members, canEdit, onSave, onDraw, isSaving, isDrawing, error }: ExternalListCardProps) {
  const avgByUser = useMemo(() => new Map(members.map((m) => [m.userId, m.avgRating])), [members]);

  const initialDraft = (): { line: DraftEntry[]; keepers: DraftEntry[] } => {
    return {
      line: game.entries.filter((e) => e.group === "line").map(toDraftEntry),
      keepers: game.entries.filter((e) => e.group === "keeper").map(toDraftEntry),
    };
  };

  const [draft, setDraft] = useState(initialDraft);
  const [memberLine, setMemberLine] = useState<string | null>(null);
  const [memberKeeper, setMemberKeeper] = useState<string | null>(null);
  const [guestLine, setGuestLine] = useState("");
  const [guestKeeper, setGuestKeeper] = useState("");
  const [guestLineRating, setGuestLineRating] = useState("3");
  const [guestKeeperRating, setGuestKeeperRating] = useState("3");

  const usedUserIds = new Set([...draft.line, ...draft.keepers].map((e) => e.userId).filter(Boolean));
  const availableMembers = members.filter((m) => !usedUserIds.has(m.userId));
  // goleiros: só quem é goleiro; linha: todos os demais membros
  const optionsFor = (group: "line" | "keepers") =>
    availableMembers
      .filter((m) => (group === "keepers" ? m.position === "keeper" : true))
      .map((m) => ({
        value: m.userId,
        label: `${m.name} · média ${m.avgRating.toFixed(1).replace(".", ",")}`,
      }));

  // quando não é editável, mostra o que está salvo no servidor
  const serverView = useMemo(
    () => ({
      line: game.entries.filter((e) => e.group === "line").map(toDraftEntry),
      keepers: game.entries.filter((e) => e.group === "keeper").map(toDraftEntry),
    }),
    [game.entries]
  );
  const view = canEdit ? draft : serverView;

  const displayNameOf = (e: DraftEntry) => (e.userId ? (members.find((m) => m.userId === e.userId)?.name ?? "Jogador") : (e.name ?? ""));
  const ratingLabel = (e: DraftEntry) =>
    e.userId ? `média ${(avgByUser.get(e.userId) ?? e.rating).toFixed(1).replace(".", ",")}` : `nota ${e.rating.toFixed(1).replace(".", ",")}`;

  const addMember = (group: "line" | "keepers") => {
    const userId = group === "line" ? memberLine : memberKeeper;
    if (!userId) return;
    setDraft((d) => ({
      ...d,
      [group]: [...d[group], { userId, rating: avgByUser.get(userId) ?? 3 }],
    }));
    if (group === "line") setMemberLine(null);
    else setMemberKeeper(null);
  };

  const addGuest = (group: "line" | "keepers") => {
    const name = (group === "line" ? guestLine : guestKeeper).trim();
    const rating = Number(group === "line" ? guestLineRating : guestKeeperRating);
    if (!name) return;
    setDraft((d) => ({ ...d, [group]: [...d[group], { name, rating }] }));
    if (group === "line") {
      setGuestLine("");
      setGuestLineRating("3");
    } else {
      setGuestKeeper("");
      setGuestKeeperRating("3");
    }
  };

  const removeAt = (group: "line" | "keepers", idx: number) => {
    setDraft((d) => ({ ...d, [group]: d[group].filter((_, i) => i !== idx) }));
  };

  const canSave = draft.line.length > 0;
  const canDraw = canSave && (game.status === "scheduled" || game.status === "open");

  const handleSave = () => {
    onSave(draft.line, draft.keepers);
  };

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={700} size="lg">
          Lista externa
        </Text>
        {canDraw && (
          <ConfirmButton
            title="Sortear os times?"
            message="A lista digitada vira os times da rodada, balanceada pelas notas. Depois do sorteio não dá mais para editar a lista."
            confirmLabel="Sortear"
            confirmColor="grass"
            color="grass"
            variant="light"
            size="compact-sm"
            loading={isDrawing}
            onConfirm={onDraw}
          >
            Sortear times
          </ConfirmButton>
        )}
      </Group>

      {canEdit && (
        <Text c="dimmed" size="sm" mb="sm">
          Digite quem vai jogar: escolha membros pelo nome (sorteio usa a média de bolas) ou inclua convidados com uma nota, que serve só
          para dividir os times.
        </Text>
      )}
      {!canEdit && game.status === "scheduled" && (
        <Text c="dimmed" size="sm" mb="md">
          A lista desta rodada é definida pelo manager e pelos auxiliares.
        </Text>
      )}

      {error != null && <ErrorBox error={error} />}

      <Stack gap="lg">
        {(["line", "keepers"] as const).map((group) => (
          <div key={group}>
            <Group justify="space-between" mb={4} px="xs">
              <Text className="eyebrow">{group === "line" ? "Linha" : "Goleiros"}</Text>
              <Text className="digits" size="sm" c="dimmed">
                {view[group].length}
              </Text>
            </Group>

            {view[group].length === 0 ? (
              <Text c="dimmed" size="sm" py={4} px="xs">
                {canEdit ? "Ninguém adicionado ainda." : "Lista ainda não definida."}
              </Text>
            ) : (
              <Stack gap={0}>
                {view[group].map((e, i) => (
                  <PlayerRow
                    key={e.userId ?? `${e.name}-${i}`}
                    name={displayNameOf(e)}
                    position={group === "keepers" ? "keeper" : "line"}
                    order={`${i + 1}`}
                    trailing={
                      <Group gap={8} wrap="nowrap">
                        <Badge size="xs" variant="light" c={e.userId ? "grass.4" : "refletor.4"} className="digits">
                          {ratingLabel(e)}
                        </Badge>
                        {canEdit && (
                          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeAt(group, i)} aria-label="Remover">
                            <IconTrash size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    }
                  />
                ))}
              </Stack>
            )}

            {canEdit && (
              <Stack gap={6} mt="sm" px="xs">
                <Group gap={6} wrap="nowrap" align="flex-end">
                  <Select
                    placeholder={group === "keepers" ? "Buscar goleiro…" : "Buscar membro…"}
                    data={optionsFor(group)}
                    value={group === "line" ? memberLine : memberKeeper}
                    onChange={(x) => (group === "line" ? setMemberLine : setMemberKeeper)(x)}
                    searchable
                    nothingFoundMessage={group === "keepers" ? "Nenhum goleiro na pelada" : "Ninguém encontrado"}
                    flex={1}
                    size="sm"
                  />
                  <ActionIcon
                    variant="light"
                    color="grass"
                    size="lg"
                    disabled={!((group === "line" ? memberLine : memberKeeper) ?? null)}
                    onClick={() => addMember(group)}
                    aria-label="Adicionar membro"
                  >
                    <IconUserPlus size={16} />
                  </ActionIcon>
                </Group>
                <Group gap={6} wrap="nowrap" align="flex-end">
                  <TextInput
                    placeholder="Convidado (nome)"
                    value={group === "line" ? guestLine : guestKeeper}
                    onChange={(e) => (group === "line" ? setGuestLine : setGuestKeeper)(e.currentTarget.value)}
                    maxLength={60}
                    flex={1}
                    size="sm"
                  />
                  <Select
                    data={RATING_OPTIONS}
                    value={group === "line" ? guestLineRating : guestKeeperRating}
                    onChange={(x) => {
                      if (!x) return;
                      (group === "line" ? setGuestLineRating : setGuestKeeperRating)(x);
                    }}
                    w={76}
                    size="sm"
                    allowDeselect={false}
                  />
                  <ActionIcon
                    variant="light"
                    color="refletor"
                    size="lg"
                    disabled={!(group === "line" ? guestLine : guestKeeper).trim()}
                    onClick={() => addGuest(group)}
                    aria-label="Adicionar convidado"
                  >
                    <IconShieldPlus size={16} />
                  </ActionIcon>
                </Group>
              </Stack>
            )}
          </div>
        ))}
      </Stack>

      {canEdit && (
        <Button mt="lg" fullWidth loading={isSaving} disabled={!canSave} onClick={handleSave}>
          Salvar lista
        </Button>
      )}
      {canEdit && !canSave && (
        <Text c="dimmed" size="xs" ta="center" mt={6}>
          Adicione pelo menos um jogador de linha para salvar.
        </Text>
      )}
    </Card>
  );
}
