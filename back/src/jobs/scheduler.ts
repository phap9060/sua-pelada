import { tickGames } from "../lib/draw";

const INTERVAL_MS = 20_000;

export function startScheduler() {
  const run = async () => {
    try {
      await tickGames();
    } catch (err) {
      console.error("[scheduler] erro:", err);
    }
  };
  run();
  setInterval(run, INTERVAL_MS);
  console.log(`[scheduler] rodando a cada ${INTERVAL_MS / 1000}s`);
}
