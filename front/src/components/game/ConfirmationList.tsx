import { Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { PlayerRow } from "../ui/PlayerRow";
import { FieldPositionBadge } from "../ui/FieldPositionBadge";
import { fmtTimeWithSeconds } from "../../utils/date";
import { buildWhatsAppListMessage, whatsappShareUrl } from "../../utils/share";
import type { FieldPosition, GamePayload } from "../../types";

interface Props {
  game: GamePayload;
  peladaId: string;
  peladaName: string;
}

interface Row {
  userId: string;
  name: string;
  position: string;
  fieldPosition?: FieldPosition;
  fieldPositionSecondary?: FieldPosition | null;
  confirmedAt: Date;
  pos: number;
}

interface SectionProps {
  title: string;
  count: number;
  capacity: number;
  rows: { titulares: Row[]; suplentes: Row[] };
}

function Section({ title, count, capacity, rows }: SectionProps) {
  const all = [...rows.titulares.map((r) => ({ ...r, titular: true })), ...rows.suplentes.map((r) => ({ ...r, titular: false }))];
  return (
    <div>
      <Group justify="space-between" mb={4} px="xs">
        <Text className="eyebrow">{title}</Text>
        <Text className="digits" size="sm" c={count >= capacity ? "grass.4" : "dimmed"}>
          {count}/{capacity}
        </Text>
      </Group>
      {all.length === 0 ? (
        <Text c="dimmed" size="sm" py={4} px="xs">
          Ninguém confirmou ainda.
        </Text>
      ) : (
        <Stack gap={0}>
          {all.map((r) => (
            <PlayerRow
              key={r.userId}
              name={r.name}
              position={r.position}
              order={`${r.pos}º`}
              trailing={
                <Group gap={8} wrap="nowrap">
                  <Text c="dimmed" size="xs" className="digits">
                    {fmtTimeWithSeconds(r.confirmedAt)}
                  </Text>
                  <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: "0.06em" }} c={r.titular ? "grass.4" : "dimmed"}>
                    {r.titular ? "titular" : "suplente"}
                  </Text>
                </Group>
              }
            >
              <FieldPositionBadge primary={r.fieldPosition} secondary={r.fieldPositionSecondary} position={r.position} />
            </PlayerRow>
          ))}
        </Stack>
      )}
    </div>
  );
}

/** Lista de confirmados em duas cotas: linha e goleiros. */
export function ConfirmationList({ game, peladaId, peladaName }: Props) {
  const lineCount = game.line.titulares.length + game.line.suplentes.length;
  const keeperCount = game.keepers.titulares.length + game.keepers.suplentes.length;
  const total = lineCount + keeperCount;

  const shareWhatsApp = () => {
    const appUrl = `${window.location.origin}/peladas/${peladaId}`;
    window.open(whatsappShareUrl(buildWhatsAppListMessage(game, peladaName, appUrl)), "_blank");
  };

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={700} size="lg">
          Lista de presença
        </Text>
        <Button
          variant="light"
          color="grass"
          size="compact-sm"
          leftSection={<IconBrandWhatsapp size={15} />}
          onClick={shareWhatsApp}
          disabled={total === 0}
        >
          WhatsApp
        </Button>
      </Group>
      <Stack gap="lg">
        <Section
          title="Linha"
          count={lineCount}
          capacity={game.listCapacity}
          rows={{ titulares: game.line.titulares, suplentes: game.line.suplentes }}
        />
        <hr className="chalk-rule" />
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
