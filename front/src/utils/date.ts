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
