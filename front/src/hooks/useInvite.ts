import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { MINE_KEY, inviteKey } from "../lib/queryKeys";
import { invitesService } from "../services/invites";

export function useInvite(token: string) {
  return useQuery({
    queryKey: inviteKey(token),
    queryFn: () => invitesService.info(token),
    enabled: !!token,
    retry: false,
  });
}

export function useJoinPelada(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (selfRating: number) => invitesService.join(token, selfRating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MINE_KEY });
      queryClient.invalidateQueries({ queryKey: inviteKey(token) });
      notifications.show({ title: "Bem-vindo!", message: "Você entrou na pelada. Os membros foram notificados para te avaliar.", color: "grass" });
    },
  });
}
