import { useQuery } from "@tanstack/react-query";
import { MINE_KEY } from "../lib/queryKeys";
import { peladasService } from "../services/peladas";

export function useMine() {
  return useQuery({ queryKey: MINE_KEY, queryFn: peladasService.mine });
}
