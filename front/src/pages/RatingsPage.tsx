import { useState } from "react";
import { ActionIcon, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconStar } from "@tabler/icons-react";
import { useCompleteRating, usePendingRatings } from "../hooks/useRatings";
import { BallRating } from "../components/BallRating";
import { PlayerDot } from "../components/ui/PlayerRow";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBox } from "../components/ui/ErrorBox";
import { CardSkeleton } from "../components/ui/Skeletons";

export function RatingsPage() {
  const { data: pending, isLoading, isError, error } = usePendingRatings();
  const [stars, setStars] = useState<Record<string, number>>({});
  const [done, setDone] = useState(0);
  const [cursor, setCursor] = useState(0);
  const complete = useCompleteRating();

  if (isLoading) return <CardSkeleton lines={3} />;
  if (isError) return <ErrorBox error={error} />;
  const items = pending ?? [];
  const itemsCount = items.length;
  // lista muda quando uma carta sai; cursor nunca passa do fim
  const safeCursor = itemsCount > 0 ? Math.min(cursor, itemsCount - 1) : 0;
  const total = done + itemsCount;

  // a carta da vez é a do cursor; navegar não tira a carta da fila
  const r = itemsCount > 0 ? items[safeCursor] : undefined;

  const submit = () => {
    const value = stars[r?.requestId ?? ""];
    if (!r || !value) return;
    complete.mutate(
      { requestId: r.requestId, stars: value },
      {
        onSuccess: () => {
          setDone((d) => d + 1);
          // mostra a carta seguinte (o clamp segura no fim da fila)
          setCursor((c) => Math.min(c + 1, Math.max(itemsCount - 2, 0)));
        },
      }
    );
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2} fz={28}>
            Avaliações
          </Title>
          <Text c="dimmed" size="sm">
            Uma carta por jogador. Toque nas bolas ou luvas e envie; não conhece o jogador? Use as setas e volte depois.
          </Text>
        </div>
        {total > 0 && (
          <Text className="digits" fz={22} c="grass.4">
            {done + safeCursor + 1}/{total}
          </Text>
        )}
      </Group>

      {total === 0 && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <EmptyState
            icon={<IconStar size={34} stroke={1.4} />}
            title="Tudo avaliado!"
            hint="Você está em dia. As próximas notas aparecem aqui depois de cada rodada."
          />
        </Card>
      )}

      {r && (
        <>
          {/* trilha de progresso: uma marcação por jogador da rodada */}
          <Group gap={6}>
            {Array.from({ length: total }).map((_, di) => (
              <span
                key={di}
                style={{
                  width: di === done + safeCursor ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: di < done ? "var(--mantine-color-grass-7)" : "rgba(232,242,234,0.15)",
                  transition: "width .25s ease",
                }}
              />
            ))}
          </Group>

          <Group align="center" gap="sm" wrap="nowrap">
            <ActionIcon
              size="lg"
              radius="xl"
              variant="default"
              disabled={safeCursor === 0}
              onClick={() => setCursor(safeCursor - 1)}
              aria-label="Jogador anterior"
            >
              <IconChevronLeft size={20} stroke={2} />
            </ActionIcon>

            <Card key={r.requestId} shadow="sm" padding="xl" radius="lg" withBorder className="rating-card-enter" style={{ flex: 1, minWidth: 0 }}>
              <Stack align="center" gap="md">
                <PlayerDot name={r.rateeName} position={r.rateePosition} />
                <Stack gap={2} ta="center">
                  <Text fw={800} fz={24}>
                    {r.rateeName}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {r.peladaName}
                  </Text>
                </Stack>

                <BallRating
                  value={stars[r.requestId] ?? 0}
                  onChange={(v) => setStars((s) => ({ ...s, [r.requestId]: v }))}
                  size={46}
                  position={r.rateePosition}
                />

                <Text c="dimmed" size="xs">
                  {r.rateePosition === "keeper"
                    ? `${stars[r.requestId] ?? 0} de 5 luvas`
                    : `${stars[r.requestId] ?? 0} de 5 bolas`}
                </Text>

                <Button
                  fullWidth
                  size="md"
                  disabled={!stars[r.requestId]}
                  loading={complete.isPending}
                  onClick={submit}
                  maw={320}
                >
                  Enviar nota
                </Button>
                {complete.isError && <ErrorBox error={complete.error} />}
              </Stack>
            </Card>

            <ActionIcon
              size="lg"
              radius="xl"
              variant="default"
              disabled={safeCursor >= itemsCount - 1}
              onClick={() => setCursor(safeCursor + 1)}
              aria-label="Próximo jogador"
            >
              <IconChevronRight size={20} stroke={2} />
            </ActionIcon>
          </Group>
        </>
      )}
    </Stack>
  );
}
