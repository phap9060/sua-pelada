import { Fragment } from "react";
import dayjs from "dayjs";
import type { GamePayload } from "../../types";

interface MatchTimelineProps {
  game: GamePayload;
  now: number;
}

interface Phase {
  label: string;
  at: number;
  sub?: string;
}

/**
 * A linha de giz do dia de jogo: abre → fecha (sorteio) → bola rolando.
 * O momento atual pulsa em verde; o que passou assenta em giz.
 */
export function MatchTimeline({ game, now }: MatchTimelineProps) {
  const phases: Phase[] =
    game.useExternalList === true
      ? [
          { label: "Lista digitada", at: new Date(game.confirmOpenAt).getTime(), sub: "pelo manager" },
          { label: "Sortear times", at: new Date(game.confirmCloseAt).getTime(), sub: "times na mesa" },
          { label: "Bola rolando", at: new Date(game.gameAt).getTime() },
        ]
      : [
          { label: "Confirmação abre", at: new Date(game.confirmOpenAt).getTime() },
          { label: "Fecha · sorteio", at: new Date(game.confirmCloseAt).getTime(), sub: "times na mesa" },
          { label: "Bola rolando", at: new Date(game.gameAt).getTime() },
        ];

  const stateOf = (i: number): "done" | "active" | "todo" => {
    if (now >= phases[i].at && now < (phases[i + 1]?.at ?? Infinity)) return "active";
    return now >= phases[i].at ? "done" : "todo";
  };

  return (
    <div className="sp-tl" aria-label="Linha do tempo do jogo">
      {phases.map((p, i) => {
        const st = stateOf(i);
        return (
          <Fragment key={p.label}>
            {i > 0 && <div className="sp-tl-seg" {...(now >= p.at ? { "data-done": "" } : {})} />}
            <div className="sp-tl-node" data-state={st}>
              <span className="sp-tl-dot" />
              <span className="sp-tl-label">{p.label}</span>
              <span className="sp-tl-time">
                {dayjs(p.at).format("ddd HH:mm")}
                {p.sub && (
                  <>
                    <br />
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>{p.sub.toUpperCase()}</span>
                  </>
                )}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
