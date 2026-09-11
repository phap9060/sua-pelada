import { Rating } from "@mantine/core";
import { IconBallFootball } from "@tabler/icons-react";
import { GloveIcon } from "./GloveIcon";
import type { PlayerPosition } from "../types";

interface BallRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  /** frações de exibição/escolha (2 = meia bola; é o padrão, inclusive ao clicar) */
  fractions?: number;
  /** posição do AVALIADO: linha = bolas, goleiro = luvas */
  position?: PlayerPosition;
}

/** Avaliação de 1 a 5 em passos de 0,5: bolas para jogador de linha, luvas para goleiro. */
export function BallRating({ value, onChange, size = 28, readOnly = false, fractions = 2, position = "line" }: BallRatingProps) {
  const symbol = position === "keeper" ? <GloveIcon size={size} /> : <IconBallFootball size={size} stroke={1.5} />;
  const emptySymbol = <span style={{ opacity: 0.28 }}>{symbol}</span>;
  const label = position === "keeper" ? `${value} de 5 luvas` : `${value} de 5 bolas`;
  return (
    <Rating
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      count={5}
      fractions={fractions}
      emptySymbol={emptySymbol}
      fullSymbol={symbol}
      aria-label={label}
    />
  );
}
