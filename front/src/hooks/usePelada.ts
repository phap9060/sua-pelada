import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";
import { ALL_GAMES_KEY, ALL_PELADAS_KEY, MINE_KEY, peladaKey, gameKey } from "../lib/queryKeys";
import { peladasService } from "../services/peladas";
import type { UpdatePeladaInput } from "../services/types";

export function usePelada(id: string) {
  return useQuery({ queryKey: peladaKey(id), queryFn: () => peladasService.get(id), enabled: !!id });
}

export function useUpdatePelada(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePeladaInput) => peladasService.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peladaKey(id) });
      queryClient.invalidateQueries({ queryKey: gameKey(id) });
      notifications.show({ title: "Configuração salva", message: "Os próximos jogos seguirão a nova agenda.", color: "grass" });
    },
  });
}

export function useTriggerRatingRound(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => peladasService.triggerRatingRound(peladaId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ALL_PELADAS_KEY });
      queryClient.invalidateQueries({ queryKey: ALL_GAMES_KEY });
      notifications.show({
        title: `Rodada ${data.round} disparada!`,
        message: "Todos foram notificados para reavaliar os jogadores.",
        color: "grass",
      });
    },
  });
}

export function useAppointAssistant(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => peladasService.appointAssistant(peladaId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peladaKey(peladaId) });
      notifications.show({ title: "Auxiliar nomeado", message: "Agora ele pode consagrar campeões, editar a pelada e disparar rodadas.", color: "grass" });
    },
  });
}

export function useRemoveAssistant(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => peladasService.removeAssistant(peladaId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peladaKey(peladaId) });
      notifications.show({ title: "Auxiliar removido", message: "Ele voltou a ser um membro comum.", color: "yellow" });
    },
  });
}

export function useRemoveMember(peladaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => peladasService.removeMember(peladaId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peladaKey(peladaId) });
      notifications.show({ title: "Jogador removido", message: "Ele saiu da lista da pelada.", color: "yellow" });
    },
  });
}

export function useLeavePelada(peladaId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => peladasService.leave(peladaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peladaKey(peladaId) });
      queryClient.invalidateQueries({ queryKey: MINE_KEY });
      notifications.show({ title: "Você saiu da pelada", message: "Suas notas e confirmações foram removidas.", color: "yellow" });
      navigate("/");
    },
  });
}
