import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import { GloveIcon } from "../GloveIcon";
import { fmtTimeWithSeconds } from "../../utils/date";
import type { GamePayload } from "../../types";

interface Props {
  game: GamePayload;
}

interface Row {
  userId: string;
  name: string;
  position: string;
  confirmedAt: Date;
  pos: number;
}

function RowItem({ row, kind }: { row: Row; kind: "titular" | "suplente" }) {
  return (
    <Group justify="space-between" px="xs" py={6} bg={kind === "titular" ? "rgba(34,197,94,0.07)" : undefined} style={{ borderRadius: 8 }}>
      <Group gap="sm">
        <span className="shirt-num">{row.pos}º</span>
        <Text>{row.name}</Text>
        {row.position === "keeper" && (
          <Badge color="refletor" variant="light" size="xs" leftSection={<GloveIcon size={12} />}>
            goleiro
          </Badge>
        )}
        <Text c="dimmed" size="xs" className="digits">
          às {fmtTimeWithSeconds(row.confirmedAt)}
        </Text>
      </Group>
      <Badge color={kind === "titular" ? "grass" : "gray"} variant="light">
        {kind}
      </Badge>
    </Group>
  );
}

function Section({
  title,
  count,
  capacity,
  rows,
}: {
  title: string;
  count: number;
  capacity: number;
  rows: { titulares: Row[]; suplentes: Row[] };
}) {
  return (
    <>
      <Group justify="space-between" mb={4}>
        <Text fw={700} size="sm" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </Text>
        <Text className="digits" size="sm" c="grass.4">
          {count}/{capacity}
        </Text>
      </Group>
      {rows.titulares.length === 0 && rows.suplentes.length === 0 && (
        <Text c="dimmed" size="sm" py={4}>
          Ninguém confirmou ainda.
        </Text>
      )}
      {rows.titulares.map((r) => (
        <RowItem key={r.userId} row={r} kind="titular" />
      ))}
      {rows.suplentes.map((r) => (
        <RowItem key={r.userId} row={r} kind="suplente" />
      ))}
    </>
  );
}

/** Lista de confirmados em duas cotas: linha e goleiros, cada uma com sua fila. */
export function ConfirmationList({ game }: Props) {
  const lineCount = game.line.titulares.length + game.line.suplentes.length;
  const keeperCount = game.keepers.titulares.length + game.keepers.suplentes.length;
  const total = lineCount + keeperCount;

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Text fw={700} size="lg" mb="sm">
        Lista ({total})
      </Text>
      {total === 0 && (
        <Text c="dimmed" ta="center" py="md">
          Ninguém confirmou ainda — garanta a primeira vaga.
        </Text>
      )}
      <Stack gap="sm">
        <Section
          title="Linha"
          count={lineCount}
          capacity={game.listCapacity}
          rows={{ titulares: game.line.titulares, suplentes: game.line.suplentes }}
        />
        <Section
          title="Goleiros"
          count={keeperCount}
          capacity={game.keeperCapacity}
          rows={{ titulares: game.keepers.titulares, suplentes: game.keepers.suplentes }}
        />
      </Stack>
    </Card>
  );
}
