import { useEffect, useRef, useState } from "react";
import { Button } from "@mantine/core";
import { BigRedButton } from "../BigRedButton";
import { ConfirmButton } from "../ui/ConfirmButton";
import { fmtCountdown } from "../../utils/date";
import type { GamePayload } from "../../types";

interface Props {
  game: GamePayload;
  now: number;
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Máquina de estados do botão gigante: desabilitado fora da janela, pulsante quando aberto. */
export function ConfirmationButton({ game, now, isBusy, onConfirm, onCancel }: Props) {
  const openAt = new Date(game.confirmOpenAt).getTime();
  const closeAt = new Date(game.confirmCloseAt).getTime();
  const canEdit = game.status === "open" || game.status === "scheduled";
  const isOpen = now >= openAt && now < closeAt && canEdit;

  // payoff do clique: anima uma vez quando a confirmação acaba de acontecer
  const [justLocked, setJustLocked] = useState(false);
  const wasConfirmed = useRef(game.myConfirmation);
  useEffect(() => {
    if (!wasConfirmed.current && game.myConfirmation) {
      setJustLocked(true);
      const t = setTimeout(() => setJustLocked(false), 700);
      return () => clearTimeout(t);
    }
    wasConfirmed.current = game.myConfirmation;
  }, [game.myConfirmation]);

  let label: string;
  let sublabel: string;
  let disabled = true;
  let inList = false;
  let pulse = false;
  let onClick: (() => void) | undefined;

  if (game.myConfirmation) {
    label = "Na lista!";
    sublabel = "Você confirmou presença";
    inList = true;
  } else if (isOpen) {
    label = "Confirmar";
    sublabel = `Fecha em ${fmtCountdown(closeAt - now)} — clique rápido, a ordem define a lista!`;
    disabled = isBusy;
    pulse = true;
    onClick = onConfirm;
  } else if (now < closeAt && canEdit) {
    label = "Confirmar";
    sublabel = `Abre em ${fmtCountdown(openAt - now)}`;
  } else {
    label = "Fechado";
    sublabel = "A confirmação encerrou";
  }

  return (
    <>
      <BigRedButton
        label={label}
        sublabel={sublabel}
        disabled={disabled}
        inList={inList}
        pulse={pulse}
        locked={justLocked}
        onClick={onClick}
      />
      {game.myConfirmation && canEdit && (
        <div style={{ textAlign: "center" }}>
          <ConfirmButton
            title="Desistir do jogo?"
            message="Você sai da lista e volta para o fim da ordem se confirmar de novo. Suplentes sobem na fila."
            confirmLabel="Desistir"
            confirmColor="red"
            color="red"
            variant="light"
            disabled={isBusy}
            onConfirm={onCancel}
          >
            Desistir
          </ConfirmButton>
        </div>
      )}
    </>
  );
}
