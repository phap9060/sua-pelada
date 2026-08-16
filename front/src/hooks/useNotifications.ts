import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NOTIFICATIONS_KEY } from "../lib/queryKeys";
import { notificationsService } from "../services/notifications";

const BADGE_POLL_MS = 30_000;

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: notificationsService.list,
    refetchInterval: BADGE_POLL_MS,
  });
}

export function useReadAllNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.readAll,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
