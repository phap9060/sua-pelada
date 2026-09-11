import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { ALL_CHAMPIONSHIPS_KEY, championshipListKey } from "../lib/queryKeys";
import { championshipsService } from "../services/championships";
import type { MatchResultInput, UpdateChampionshipInput } from "../services/types";

const DRAFT_POLL_MS = 3_000;

/** Campeonato ativo + histórico de campeões da pelada; polling acelerado durante o draft. */
export function useChampionships(peladaId: string) {
  return useQuery({
    queryKey: championshipListKey(peladaId),
    queryFn: () => championshipsService.list(peladaId),
    enabled: !!peladaId,
    refetchInterval: (query) => (query.state.data?.championship?.status === "drafting" ? DRAFT_POLL_MS : false),
  });
}

function useChampMutation<TVars, TData = unknown>(
  peladaId: string,
  mutationFn: (vars: TVars) => Promise<TData>,
  success?: (data: TData, vars: TVars) => void
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ALL_CHAMPIONSHIPS_KEY });
      success?.(data, vars);
    },
  });
}

export function useCreateChampionship(peladaId: string) {
  return useChampMutation(peladaId, (body: Parameters<typeof championshipsService.create>[1]) =>
    championshipsService.create(peladaId, body)
  );
}

export function useUpdateChampionship(championshipId: string) {
  return useChampMutation(championshipId, (body: UpdateChampionshipInput) => championshipsService.update(championshipId, body), () =>
    notifications.show({ title: "Configuração salva", message: "O campeonato foi atualizado.", color: "grass" })
  );
}

export function useChampionshipOptIn(championshipId: string, peladaId: string) {
  return useChampMutation(championshipId, (opts: { optIn: boolean }) =>
    opts.optIn ? championshipsService.optIn(championshipId) : championshipsService.optOut(championshipId)
  );
}

export function useStartDraft(championshipId: string) {
  return useChampMutation<void>(championshipId, () => championshipsService.startDraft(championshipId), () =>
    notifications.show({ title: "Draft aberto!", message: "Capitães, é a hora de montar os times.", color: "grass" })
  );
}

export function useCaptainRatingRound(championshipId?: string) {
  return useChampMutation(championshipId ?? "", (id?: string) =>
    championshipsService.captainRatingRound(id ?? championshipId ?? "")
  );
}

export function useDraftPick(championshipId: string) {
  return useChampMutation(championshipId, (userId: string) => championshipsService.pick(championshipId, userId));
}

export function useUndoPick(championshipId: string) {
  return useChampMutation<void>(championshipId, () => championshipsService.undoPick(championshipId), () =>
    notifications.show({ title: "Escolha desfeita", message: "O jogador voltou para o pool.", color: "yellow" })
  );
}

export function useFinalizeDraft(championshipId: string) {
  return useChampMutation<void>(championshipId, () => championshipsService.finalizeDraft(championshipId), () =>
    notifications.show({ title: "Draft finalizado!", message: "A tabela de jogos foi gerada.", color: "grass" })
  );
}

export function useRenameTeam(championshipId: string) {
  return useChampMutation(championshipId, (vars: { teamId: string; name: string }) =>
    championshipsService.renameTeam(vars.teamId, { name: vars.name })
  );
}

export function useReplacePlayer(championshipId: string) {
  return useChampMutation(championshipId, (vars: { teamId: string; fromUserId: string; toUserId: string }) =>
    championshipsService.replacePlayer(vars.teamId, vars.fromUserId, vars.toUserId)
  );
}

export function usePostResult(championshipId: string) {
  return useChampMutation(championshipId, (vars: { matchId: string; body: MatchResultInput }) =>
    championshipsService.postResult(championshipId, vars.matchId, vars.body)
  );
}

export function useFinalizeRound(championshipId: string) {
  return useChampMutation(championshipId, (round: number) => championshipsService.finalizeRound(championshipId, round), () =>
    notifications.show({ title: "Rodada finalizada", message: "Os resultados ficaram travados.", color: "grass" })
  );
}

export function useGenerateKnockout(championshipId: string) {
  return useChampMutation<void>(championshipId, () => championshipsService.generateKnockout(championshipId), () =>
    notifications.show({ title: "Mata-mata gerado!", message: "Os classificados estão na chave.", color: "grass" })
  );
}

export function useCancelChampionship(championshipId: string) {
  return useChampMutation<void>(championshipId, () => championshipsService.cancel(championshipId), () =>
    notifications.show({ title: "Campeonato cancelado", message: "Ele saiu da aba da pelada.", color: "yellow" })
  );
}
