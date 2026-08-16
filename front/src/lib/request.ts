/** Desempacota a resposta do Eden treaty (Promise): devolve `data` ou lança o erro. */
export async function unwrap<T>(
  res: Promise<{ data: T | null; error: { status: unknown; value: unknown } | null }>
): Promise<T> {
  const r = await res;
  if (r.error) throw r.error;
  return r.data as T;
}

/** Mensagem legível de qualquer erro (treaty, http, unknown). */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { value?: { message?: string }; message?: string };
    if (e.value?.message) return e.value.message;
    if (e.message) return e.message;
  }
  return "Algo deu errado. Tente novamente.";
}
