import { Badge } from "@mantine/core";
import type { FieldPosition } from "../../types";

const SHORT: Record<FieldPosition, string> = { zagueiro: "ZAG", meia: "MEI", atacante: "ATA" };

/** Rótulo curto das posições de linha: "MEI" ou "MEI/ZAG" quando tem secundária. */
export function fieldPositionLabel(primary?: FieldPosition | null, secondary?: FieldPosition | null): string | null {
  if (!primary) return null;
  return secondary && secondary !== primary ? `${SHORT[primary]}/${SHORT[secondary]}` : SHORT[primary];
}

/** Badge compacto com a posição de campo; goleiro não exibe (só vale na linha). */
export function FieldPositionBadge({
  primary,
  secondary,
  position,
}: {
  primary?: FieldPosition | null;
  secondary?: FieldPosition | null;
  position?: string;
}) {
  if (position === "keeper") return null;
  const label = fieldPositionLabel(primary, secondary);
  if (!label) return null;
  return (
    <Badge size="xs" variant="light" color="terra" title={secondary ? `${primary} + ${secondary}` : primary ?? ""}>
      {label}
    </Badge>
  );
}
