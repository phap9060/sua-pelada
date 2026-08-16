import { Badge, Button, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import type { GamePayload } from "../../types";

interface Props {
  game: GamePayload;
  canCrown: boolean;
  onCrown: (teamId: string) => void;
}

/** Times sorteados + ação do manager/auxiliar de consagrar o campeão do dia. */
export function TeamsGrid({ game, canCrown, onCrown }: Props) {
  const canCrownNow = canCrown && game.status === "drawn";
  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Text fw={700} size="lg" mb="sm">
        Times sorteados
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
        {game.teams.map((t) => (
          <Card
            key={t.id}
            padding="md"
            radius="lg"
            withBorder
            style={
              t.isChampion
                ? { borderColor: "var(--mantine-color-yellow-5)", boxShadow: "0 0 14px rgba(234,179,8,0.35)" }
                : undefined
            }
          >
            <Group justify="space-between" mb={8}>
              <Text fw={700}>{t.name}</Text>
              {t.isChampion && <Text fw={700}>👑</Text>}
            </Group>
            <Stack gap={2}>
              {t.players.map((p) => (
                <Group key={p.id} gap="xs" wrap="nowrap">
                  <Text size="sm">{p.name}</Text>
                  {p.position === "keeper" && (
                    <Badge color="yellow" variant="light" size="xs">
                      🧤 goleiro
                    </Badge>
                  )}
                </Group>
              ))}
            </Stack>
            {canCrownNow && !t.isChampion && (
              <Button variant="light" color="yellow" fullWidth mt="sm" onClick={() => onCrown(t.id)}>
                Consagrar campeão
              </Button>
            )}
          </Card>
        ))}
      </SimpleGrid>
      {canCrownNow && (
        <Text c="dimmed" size="sm" mt="sm">
          Ao fim da pelada, consagre o time que mais ganhou no dia.
        </Text>
      )}
    </Card>
  );
}
