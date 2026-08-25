import { useQuery } from "@tanstack/react-query";
import { ALL_GAMES_KEY } from "../lib/queryKeys";
import { peladasService } from "../services/peladas";
import type { GamePayload, Mine } from "../types";

export interface PeladaRef {
  id: string;
  name: string;
  gameWeekday: number;
  gameTime: string;
  listCapacity: number;
}

export function refsOf(mine: Mine): PeladaRef[] {
  const list: PeladaRef[] = [];
  if (mine.managed) list.push(mine.managed);
  for (const p of mine.memberOf) {
    if (!list.some((x) => x.id === p.id)) list.push(p);
  }
  return list;
}

/**
 * O próximo jogo entre todas as peladas do usuário — o herói da Home.
 * Consulta o jogo corrente de até 5 peladas e escolhe o mais próximo no futuro.
 */
export function useNextGame(mine: Mine | undefined) {
  const peladas = mine ? refsOf(mine).slice(0, 5) : [];
  return useQuery<{ pelada: PeladaRef; game: GamePayload } | null>({
    // prefixo ALL_GAMES_KEY: mutações de jogo (confirmar, cancelar) invalidam esta query também
    queryKey: [...ALL_GAMES_KEY, "next", peladas.map((p) => p.id).sort().join(",")],
    enabled: peladas.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        peladas.map(async (pelada) =>
          peladasService
            .currentGame(pelada.id)
            .then((game) => ({ pelada, game }))
            .catch(() => null)
        )
      );
      const found = results.filter((r): r is { pelada: PeladaRef; game: GamePayload } => r !== null);
      if (found.length === 0) return null;
      const now = Date.now();
      const upcoming = found.filter((r) => new Date(r.game.gameAt).getTime() >= now - 3 * 60 * 60 * 1000);
      const pool = upcoming.length > 0 ? upcoming : found;
      pool.sort((a, b) => Math.abs(new Date(a.game.gameAt).getTime() - now) - Math.abs(new Date(b.game.gameAt).getTime() - now));
      return pool[0];
    },
    refetchInterval: 15_000,
    gcTime: 30_000,
  });
}
