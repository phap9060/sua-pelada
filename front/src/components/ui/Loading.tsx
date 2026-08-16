import { Group, Loader, Text } from "@mantine/core";

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <Group justify="center" py="xl">
      <Loader size="sm" />
      <Text c="dimmed" size="sm">
        {label}
      </Text>
    </Group>
  );
}
