import { Group, Text } from "@mantine/core";
import { GloveIcon } from "../GloveIcon";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Bolinha-camisa com iniciais do jogador; goleiro ganha tratamento âmbar. */
export function PlayerDot({ name, position }: { name: string; position?: string }) {
  return (
    <span className={`player-dot${position === "keeper" ? " is-gk" : ""}`} title={name}>
      {initials(name)}
    </span>
  );
}

interface PlayerRowProps {
  name: string;
  position?: string;
  /** número da camisa / ordem ("3º") */
  order?: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/** Linha de jogador padrão: ordem opcional + bolinha + nome + extras. */
export function PlayerRow({ name, position, order, trailing, children, className }: PlayerRowProps) {
  return (
    <Group justify="space-between" wrap="nowrap" px="xs" py={7} className={className} style={{ borderRadius: 10 }}>
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        {order && <span className="shirt-num">{order}</span>}
        <PlayerDot name={name} position={position} />
        <Text truncate maw={220} size="sm" fw={600}>
          {name}
        </Text>
        {position === "keeper" && (
          <span style={{ display: "inline-flex", color: "var(--mantine-color-refletor-4)" }} title="Goleiro">
            <GloveIcon size={14} />
          </span>
        )}
        {children}
      </Group>
      {trailing}
    </Group>
  );
}
