import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { ALL_GAMES_KEY, ALL_PELADAS_KEY, PENDING_RATINGS_KEY } from "../lib/queryKeys";
import { ratingsService } from "../services/ratings";

const BADGE_POLL_MS = 30_000;

export function usePendingRatings() {
  return useQuery({
    queryKey: PENDING_RATINGS_KEY,
    queryFn: ratingsService.pending,
    refetchInterval: BADGE_POLL_MS,
  });
}

export function useCompleteRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, stars }: { requestId: string; stars: number }) =>
      ratingsService.complete(requestId, stars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_RATINGS_KEY });
      // médias dos membros mudam com a nota nova
      queryClient.invalidateQueries({ queryKey: ALL_PELADAS_KEY });
      queryClient.invalidateQueries({ queryKey: ALL_GAMES_KEY });
      notifications.show({ title: "Avaliação enviada", message: "Obrigado! A nota já entra na média do jogador.", color: "grass" });
    },
  });
}
