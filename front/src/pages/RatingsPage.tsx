import { useState } from "react";
import { Box, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useCompleteRating, usePendingRatings } from "../hooks/useRatings";
import { BallRating } from "../components/BallRating";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Loading } from "../components/ui/Loading";

export function RatingsPage() {
  const { data: pending, isLoading, isError, error } = usePendingRatings();
  const [stars, setStars] = useState<Record<string, number>>({});
  const complete = useCompleteRating();

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  const items = pending ?? [];

  const submit = (requestId: string) => {
    const value = stars[requestId];
    if (value) complete.mutate({ requestId, stars: value });
  };

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Avaliações pendentes</Title>
        <Text c="dimmed" size="sm">
          Avalie os jogadores de 1 a 5 bolas.
        </Text>
      </div>
      {items.length === 0 && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Text c="dimmed" ta="center">
            Nada pendente. Você avaliou todo mundo! ⚽
          </Text>
        </Card>
      )}
      {items.map((r) => (
        <Card key={r.requestId} shadow="sm" padding="lg" radius="lg" withBorder>
          <Title order={4}>{r.rateeName}</Title>
          <Text c="dimmed" size="sm" mb="sm">
            {r.peladaName}
          </Text>
          <Group align="center">
            <BallRating
              value={stars[r.requestId] ?? 0}
              onChange={(v) => setStars((s) => ({ ...s, [r.requestId]: v }))}
              size={40}
              position={r.rateePosition}
            />
            <Button disabled={!stars[r.requestId]} loading={complete.isPending} onClick={() => submit(r.requestId)}>
              Enviar
            </Button>
          </Group>
          {complete.isError && (
            <Box mt="sm">
              <ErrorBox error={complete.error} />
            </Box>
          )}
        </Card>
      ))}
    </Stack>
  );
}
