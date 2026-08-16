import { useQuery } from "@tanstack/react-query";
import { statsKey } from "../lib/queryKeys";
import { peladasService } from "../services/peladas";

export function useStats(peladaId: string) {
  return useQuery({ queryKey: statsKey(peladaId), queryFn: () => peladasService.stats(peladaId) });
}
