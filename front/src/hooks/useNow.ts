import { useEffect, useState } from "react";

/** Relógio que atualiza em `intervalMs` — usado para estados dependentes do tempo (janela de confirmação). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
