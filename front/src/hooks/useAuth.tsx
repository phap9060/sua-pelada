import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { authService } from "../services/auth";
import { ME_KEY } from "../lib/queryKeys";
import type { PlayerPosition, User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: authService.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const setUser = useCallback(
    (u: User | null) => {
      queryClient.setQueryData(ME_KEY, u);
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ user: user ?? null, loading: isLoading, setUser, logout }),
    [user, isLoading, setUser, logout]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

/** Troca a própria posição (linha/goleiro) — não zera as notas. */
export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (position: PlayerPosition) => authService.updatePosition(position),
    onSuccess: (updated) => {
      queryClient.setQueryData<User | null>(ME_KEY, (current) => (current ? { ...current, position: updated.position } : current));
      notifications.show({
        title: "Posição atualizada",
        message: updated.position === "keeper" ? "Você agora joga como goleiro" : "Você agora joga na linha",
        color: "grass",
      });
    },
  });
}
