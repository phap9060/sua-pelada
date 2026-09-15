import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { ALL_GAMES_KEY, gameKey } from "../lib/queryKeys";
import { gamesService, type EntryInput } from "../services/games";
import { peladasService } from "../services/peladas";

const GAME_POLL_MS = 15_000;

export function useGame(peladaId: string) {
  return useQuery({
    queryKey: gameKey(peladaId),
    queryFn: () => peladasService.currentGame(peladaId),
    refetchInterval: GAME_POLL_MS,
  });
}

export function useConfirmGame(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => gamesService.confirm(gameId),
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: gameKey(peladaId) });
      const p = game.myPlacement;
      if (!p) {
        notifications.show({ title: "Confirmado!", message: "Você está na lista.", color: "grass" });
      } else if (p.kind === "titular") {
        notifications.show({
          title: "Vaga garantida!",
          message: `Você é titular de ${p.group === "keeper" ? "goleiro" : "linha"} (${p.pos}º/${p.total}).`,
          color: "grass",
        });
      } else {
        notifications.show({
          title: "Confirmado como suplente",
          message: `Você entrou na fila de ${p.group === "keeper" ? "goleiros" : "linha"} na posição ${p.pos}º.`,
          color: "yellow",
        });
      }
    },
  });
}

export function useCancelConfirmation(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => gamesService.cancelConfirmation(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKey(peladaId) });
      notifications.show({ title: "Desistência registrada", message: "Suplentes sobem na ordem do clique.", color: "yellow" });
    },
  });
}

export function useCrownChampion(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, teamId }: { gameId: string; teamId: string }) =>
      gamesService.crownChampion(gameId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKey(peladaId) });
      queryClient.invalidateQueries({ queryKey: ALL_GAMES_KEY });
      notifications.show({ title: "Campeão consagrado!", message: "O time campeão entrou para o histórico da pelada.", color: "grass" });
    },
  });
}

export function useCrownGoalkeeper(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, userId }: { gameId: string; userId: string }) =>
      gamesService.crownGoalkeeper(gameId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKey(peladaId) });
      queryClient.invalidateQueries({ queryKey: ALL_GAMES_KEY });
      notifications.show({ title: "Goleiro campeão consagrado!", message: "O goleiro entrou para o histórico da pelada.", color: "grass" });
    },
  });
}

export function useSaveEntries(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, line, keepers }: { gameId: string; line: EntryInput[]; keepers: EntryInput[] }) =>
      gamesService.saveEntries(gameId, line, keepers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKey(peladaId) });
      notifications.show({ title: "Lista salva!", message: "Os jogadores estão prontos para o sorteio.", color: "grass" });
    },
  });
}

export function useDrawTeams(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => gamesService.drawTeams(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKey(peladaId) });
      queryClient.invalidateQueries({ queryKey: ALL_GAMES_KEY });
      notifications.show({ title: "Times sorteados!", message: "Os times estão na mesa.", color: "grass" });
    },
  });
}
