import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { MINE_KEY } from "../lib/queryKeys";
import { peladasService } from "../services/peladas";
import type { CreatePeladaInput } from "../services/types";

export function useCreatePelada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePeladaInput) => peladasService.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MINE_KEY });
      notifications.show({ title: "Pelada criada!", message: "Compartilhe o link de convite com seus amigos.", color: "grass" });
    },
  });
}
