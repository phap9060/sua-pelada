/**
 * Chaves de cache do react-query, centralizadas em constantes.
 * Sempre importe daqui — nunca crie chaves soltas nos hooks/páginas.
 */
export const ME_KEY = ["me"] as const;
export const MINE_KEY = ["mine"] as const;

export const ALL_PELADAS_KEY = ["pelada"] as const;
export const peladaKey = (id: string) => ["pelada", id] as const;

export const ALL_GAMES_KEY = ["game"] as const;
export const gameKey = (peladaId: string) => ["game", peladaId] as const;

export const statsKey = (peladaId: string) => ["pelada", peladaId, "stats"] as const;

export const ALL_CHAMPIONSHIPS_KEY = ["championship"] as const;
export const championshipListKey = (peladaId: string) => ["championship", "pelada", peladaId] as const;

export const PENDING_RATINGS_KEY = ["ratings", "pending"] as const;

export const NOTIFICATIONS_KEY = ["notifications"] as const;

export const inviteKey = (token: string) => ["invite", token] as const;
