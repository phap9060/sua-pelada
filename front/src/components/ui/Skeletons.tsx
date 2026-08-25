import { Card, Skeleton, Stack } from "@mantine/core";

/** Esqueleto de card genérico (listas de peladas, notificações…). */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Skeleton height={18} width="45%" radius="md" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} height={13} width={i === lines - 1 ? "60%" : "90%"} radius="md" />
        ))}
      </Stack>
    </Card>
  );
}

/** Esqueleto do herói "próximo jogo" da Home. */
export function GameHeroSkeleton() {
  return (
    <Card withBorder padding="xl">
      <Stack gap="md">
        <Skeleton height={12} width={110} radius="md" />
        <Skeleton height={44} width="70%" radius="md" />
        <Skeleton height={180} radius="xl" />
        <Skeleton height={13} width="55%" radius="md" />
      </Stack>
    </Card>
  );
}
