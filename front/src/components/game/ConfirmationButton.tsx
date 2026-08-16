import { Button } from "@mantine/core";
import { BigRedButton } from "../BigRedButton";
import { fmtDateTime } from "../../utils/date";
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
    sublabel = `Fecha ${fmtDateTime(game.confirmCloseAt)} — clique rápido, a ordem define a lista!`;
    disabled = isBusy;
    pulse = true;
    onClick = onConfirm;
  } else if (!(now >= closeAt || game.status === "drawn" || game.status === "finished")) {
    label = "Confirmar";
    sublabel = `Abre ${fmtDateTime(game.confirmOpenAt)}`;
  } else {
    label = "Fechado";
    sublabel = "A confirmação encerrou";
  }

  return (
    <>
      <BigRedButton label={label} sublabel={sublabel} disabled={disabled} inList={inList} pulse={pulse} onClick={onClick} />
      {game.myConfirmation && canEdit && (
        <div style={{ textAlign: "center" }}>
          <Button color="red" variant="light" disabled={isBusy} onClick={onCancel}>
            Desistir
          </Button>
        </div>
      )}
    </>
  );
}
