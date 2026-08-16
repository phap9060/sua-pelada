import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import { GloveIcon } from "../GloveIcon";
import { fmtTimeWithSeconds } from "../../utils/date";
import type { GamePayload } from "../../types";

interface Props {
  game: GamePayload;
  listCapacity: number;
}

/** Lista de confirmados como escalação: números de camisa, titulares e suplentes. */
export function ConfirmationList({ game, listCapacity }: Props) {
  const total = game.titulares.length + game.suplentes.length;
  const rows = [
    ...game.titulares.map((c, i) => ({ ...c, pos: i + 1, kind: "titular" as const })),
    ...game.suplentes.map((c, i) => ({ ...c, pos: listCapacity + i + 1, kind: "suplente" as const })),
  ];

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Text fw={700} size="lg" mb="sm">
        Lista ({total})
      </Text>
      {rows.length === 0 && (
        <Text c="dimmed" ta="center" py="md">
          Ninguém confirmou ainda — garanta a primeira vaga.
        </Text>
      )}
      <Stack gap={6}>
        {rows.map((c) => (
          <Group key={c.userId} justify="space-between" px="xs" py={6} bg={c.kind === "titular" ? "rgba(34,197,94,0.07)" : undefined} style={{ borderRadius: 8 }}>
            <Group gap="sm">
              <span className="shirt-num">{c.pos}º</span>
              <Text>{c.name}</Text>
              {c.position === "keeper" && (
                <Badge color="refletor" variant="light" size="xs" leftSection={<GloveIcon size={12} />}>
                  goleiro
                </Badge>
              )}
              <Text c="dimmed" size="xs" className="digits">
                às {fmtTimeWithSeconds(c.confirmedAt)}
              </Text>
            </Group>
            <Badge color={c.kind === "titular" ? "grass" : "gray"} variant="light">
              {c.kind}
            </Badge>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
