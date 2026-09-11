import { Group, Rating, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import { IconBallFootball } from "@tabler/icons-react";
import { GloveIcon } from "./GloveIcon";
import type { PlayerPosition } from "../types";

interface BallRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  /** frações de exibição (2 = meia bola) — usado na leitura */
  fractions?: number;
  /** posição do AVALIADO: linha = bolas, goleiro = luvas */
  position?: PlayerPosition;
}

/** Meia-bola/meia-lua: mesmo glifo cortado ao meio, sobre a versão apagada. */
function HalfSymbol({ symbol, size }: { symbol: React.ReactNode; size: number }) {
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <span style={{ opacity: 0.28 }}>{symbol}</span>
      <span style={{ position: "absolute", inset: 0, clipPath: "inset(0 50% 0 0)" }}>{symbol}</span>
    </span>
  );
}

/**
 * Avaliação de 1 a 5: bolas para jogador de linha, luvas para goleiro.
 * No modo editável, tudo vive na MESMA linha: 5 bolas inteiras + ". meia-bola"
 * (o ponto + meia liga/desliga o .5 da vez; em 5 inteiro a meia desabilita).
 */
export function BallRating({ value, onChange, size = 28, readOnly = false, fractions = 2, position = "line" }: BallRatingProps) {
  const [hover, setHover] = useState<number | null>(null);

  const symbol = position === "keeper" ? <GloveIcon size={size} /> : <IconBallFootball size={size} stroke={1.5} />;
  const emptySymbol = <span style={{ opacity: 0.28 }}>{symbol}</span>;
  const unit = position === "keeper" ? "luvas" : "bolas";
  const label = `${value} de 5 ${unit}`;

  if (readOnly || !onChange) {
    return (
      <Rating
        value={value}
        readOnly
        count={5}
        fractions={fractions}
        emptySymbol={emptySymbol}
        fullSymbol={symbol}
        aria-label={label}
      />
    );
  }

  const hasHalf = value % 1 !== 0;
  const canToggleHalf = hasHalf || value < 5;
  const shown = hover ?? Math.floor(value);
  const itemBox = { display: "inline-flex", lineHeight: 0, flex: "none" } as const;

  return (
    <Group gap={2} wrap="nowrap" align="center" onMouseLeave={() => setHover(null)}>
      {Array.from({ length: 5 }, (_, i) => (
        <UnstyledButton
          key={i}
          onClick={() => onChange(i + 1)}
          onMouseEnter={() => setHover(i + 1)}
          onFocus={() => setHover(i + 1)}
          onBlur={() => setHover(null)}
          aria-label={`Avaliar com ${i + 1} ${unit}`}
          style={itemBox}
        >
          {i < shown ? symbol : emptySymbol}
        </UnstyledButton>
      ))}
      <UnstyledButton
        onClick={() => onChange(hasHalf ? Math.floor(value) : Math.floor(value) + 0.5)}
        disabled={!canToggleHalf}
        onMouseEnter={() => setHover(null)}
        aria-label={hasHalf ? "Remover a meia" : "Adicionar a meia"}
        title={hasHalf ? "Remover a meia" : canToggleHalf ? `Adicionar meia ${unit === "luvas" ? "luva" : "bola"}` : undefined}
        style={{
          ...itemBox,
          opacity: hasHalf ? 1 : canToggleHalf ? 0.6 : 0.3,
          transition: "opacity 120ms",
          cursor: !canToggleHalf ? "not-allowed" : "pointer",
        }}
      >
        <Group gap={2} wrap="nowrap" align="center" style={{ lineHeight: 0 }}>
          <span
            style={{
              width: Math.max(size * 0.16, 3),
              height: Math.max(size * 0.16, 3),
              borderRadius: 999,
              background: "currentColor",
              display: "inline-block",
              flex: "none",
            }}
          />
          <HalfSymbol symbol={symbol} size={size} />
        </Group>
      </UnstyledButton>
    </Group>
  );
}
