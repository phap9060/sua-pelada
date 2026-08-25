import { Button, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconCrown } from "@tabler/icons-react";
import { GloveIcon } from "../GloveIcon";
import { PlayerRow } from "../ui/PlayerRow";
import type { GamePayload } from "../../types";

interface Props {
  game: GamePayload;
  canCrown: boolean;
  onCrown: (teamId: string) => void;
}

/** Cores de kit por posição na mesa — cada time com sua camisa. */
const KITS = [
  { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.45)", num: "#4ade80" },
  { bg: "rgba(255,176,32,0.09)", border: "rgba(255,176,32,0.45)", num: "#ffc531" },
  { bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.45)", num: "#60a5fa" },
  { bg: "rgba(232,242,234,0.08)", border: "rgba(232,242,234,0.4)", num: "#e8f2ea" },
];

const kitOf = (i: number) => KITS[i % KITS.length];

/** Times sorteados apresentados como camisas penduradas + consagração do campeão. */
export function TeamsGrid({ game, canCrown, onCrown }: Props) {
  const canCrownNow = canCrown && game.status === "drawn";

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={700} size="lg">
          Times da rodada
        </Text>
        {canCrownNow && (
          <Text c="dimmed" size="xs" ta="right" maw={260}>
            Ao fim do dia, consagre o time que mais ganhou.
          </Text>
        )}
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {game.teams.map((t, i) => {
          const kit = kitOf(i);
          const isChampion = t.isChampion;
          return (
            <Card
              key={t.id}
              padding="md"
              radius="lg"
              withBorder
              className={isChampion ? "champion-glow" : undefined}
              style={{
                background: `linear-gradient(180deg, ${kit.bg}, transparent 65%), var(--sp-surface)`,
                borderColor: isChampion ? undefined : kit.border,
              }}
            >
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Group gap={8} wrap="nowrap">
                  {/* escudo: número do time em chip da cor do kit */}
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--sp-font-digits)",
                      fontWeight: 700,
                      fontSize: 17,
                      color: kit.num,
                      border: `1.5px solid ${kit.border}`,
                    }}
                  >
                    {i + 1}
                  </span>
                  <Text fw={800} fz="lg">
                    {t.name}
                  </Text>
                </Group>
                {isChampion && (
                  <Group gap={4} wrap="nowrap">
                    <Text size="xs" fw={700} c="refletor.4" tt="uppercase" style={{ letterSpacing: "0.08em" }}>
                      Campeão
                    </Text>
                    <IconCrown size={20} style={{ color: "var(--mantine-color-refletor-5)" }} />
                  </Group>
                )}
              </Group>

              <hr className="chalk-rule" />

              <Stack gap={1} mt="xs">
                {t.players.map((p, pi) => (
                  <PlayerRow key={p.id} name={p.name} position={p.position} order={`${pi + 1}`} />
                ))}
              </Stack>

              {canCrownNow && !isChampion && (
                <Button
                  variant="light"
                  color="refletor"
                  fullWidth
                  size="compact-sm"
                  mt="sm"
                  leftSection={<GloveIcon size={13} color="currentColor" />}
                  onClick={() => onCrown(t.id)}
                >
                  Consagrar campeão
                </Button>
              )}
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
