// Utilitários de tempo para recorrência semanal.
// A pelada vive no fuso de São Paulo (UTC-3, sem horário de verão desde 2019).
// Os cálculos são feitos no relógio local do Brasil independente do TZ do servidor,
// para que "20:30" da config seja 20:30 para os jogadores — e não 20:30 UTC.

const BRAZIL_OFFSET_MIN = -3 * 60; // America/Sao_Paulo

/** Componentes do relógio local de São Paulo de um instante (ler com getUTC*). */
function brazilLocal(d: Date) {
  return new Date(d.getTime() + BRAZIL_OFFSET_MIN * 60_000);
}

/** Constrói o instante UTC de um horário local de São Paulo. */
function fromBrazilLocal(y: number, mo: number, day: number, h: number, m: number) {
  return new Date(Date.UTC(y, mo, day, h, m) - BRAZIL_OFFSET_MIN * 60_000);
}

/** Próxima ocorrência de um dia da semana (0=domingo) + "HH:mm" estritamente após `from`. */
export function nextOccurrence(weekday: number, time: string, from: Date): Date {
  const [hh, mm] = time.split(":").map(Number);
  const fl = brazilLocal(from);
  const year = fl.getUTCFullYear();
  const month = fl.getUTCMonth();
  const day = fl.getUTCDate();
  const diff = (weekday - fl.getUTCDay() + 7) % 7;
  const target = fromBrazilLocal(year, month, day + diff, hh, mm);
  if (target.getTime() <= from.getTime()) return fromBrazilLocal(year, month, day + diff + 7, hh, mm);
  return target;
}

/** Ocorrência mais recente de um dia da semana + "HH:mm" em ou antes de `ref`. */
export function lastOccurrence(weekday: number, time: string, ref: Date): Date {
  const [hh, mm] = time.split(":").map(Number);
  const fl = brazilLocal(ref);
  const year = fl.getUTCFullYear();
  const month = fl.getUTCMonth();
  const day = fl.getUTCDate();
  const diff = (fl.getUTCDay() - weekday + 7) % 7;
  const target = fromBrazilLocal(year, month, day - diff, hh, mm);
  if (target.getTime() > ref.getTime()) return fromBrazilLocal(year, month, day - diff - 7, hh, mm);
  return target;
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
