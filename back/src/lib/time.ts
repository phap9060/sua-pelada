// Utilitários de tempo para recorrência semanal (horário local do servidor).

/** Próxima ocorrência de um dia da semana (0=domingo) + "HH:mm" estritamente após `from`. */
export function nextOccurrence(weekday: number, time: string, from: Date): Date {
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(from);
  d.setHours(hh, mm, 0, 0);
  let diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 7);
  return d;
}

/** Ocorrência mais recente de um dia da semana + "HH:mm" em ou antes de `ref`. */
export function lastOccurrence(weekday: number, time: string, ref: Date): Date {
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(ref);
  d.setHours(hh, mm, 0, 0);
  let diff = (d.getDay() - weekday + 7) % 7;
  d.setDate(d.getDate() - diff);
  if (d.getTime() > ref.getTime()) d.setDate(d.getDate() - 7);
  return d;
}

export interface PeladaSchedule {
  gameWeekday: number;
  gameTime: string;
  confirmOpenWeekday: number;
  confirmOpenTime: string;
  confirmCloseWeekday: number;
  confirmCloseTime: string;
}

/**
 * Calcula a próxima rodada da pelada: data do jogo e janela de confirmação.
 * A janela é sempre a ocorrência mais recente de abertura/fechamento anterior ao jogo.
 */
export function nextGameWindow(cfg: PeladaSchedule, now = new Date()) {
  // janela pode abrir até 6 dias antes do jogo; procuramos o jogo cuja janela ainda não fechou
  let gameAt = nextOccurrence(cfg.gameWeekday, cfg.gameTime, new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  let confirmOpenAt = lastOccurrence(cfg.confirmOpenWeekday, cfg.confirmOpenTime, gameAt);
  let confirmCloseAt = lastOccurrence(cfg.confirmCloseWeekday, cfg.confirmCloseTime, gameAt);
  // se o fechamento já passou, a rodada vale para a semana seguinte
  if (confirmCloseAt.getTime() <= now.getTime()) {
    gameAt = nextOccurrence(cfg.gameWeekday, cfg.gameTime, now);
    confirmOpenAt = lastOccurrence(cfg.confirmOpenWeekday, cfg.confirmOpenTime, gameAt);
    confirmCloseAt = lastOccurrence(cfg.confirmCloseWeekday, cfg.confirmCloseTime, gameAt);
  }
  return { gameAt, confirmOpenAt, confirmCloseAt };
}
