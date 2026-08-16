import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export function fmtDateTime(iso: string | Date) {
  return dayjs(iso).format("dddd, DD/MM/YYYY [às] HH:mm");
}

export function fmtTime(iso: string | Date) {
  return dayjs(iso).format("HH:mm");
}

export function fmtTimeWithSeconds(iso: string | Date) {
  return dayjs(iso).format("HH:mm:ss");
}

export function fmtDate(iso: string | Date) {
  return dayjs(iso).format("DD/MM/YYYY");
}

/** Contagem regressiva em formato de placar: MM:SS ou H:MM:SS. */
export function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Curto, para o placar do jogo: "Qui 13/08 · 19:00". */
export function fmtShort(iso: string | Date) {
  return dayjs(iso).format("ddd DD/MM · HH:mm");
}
