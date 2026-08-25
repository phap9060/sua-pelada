import { Stack, Text } from "@mantine/core";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

/** Tela vazia como convite à ação — nunca um beco sem saída. */
export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <Stack align="center" gap="xs" py="xl" px="md" ta="center">
      {icon && <span style={{ color: "var(--sp-chalk-dim)", opacity: 0.8 }}>{icon}</span>}
      <Text fw={700} size="lg">
        {title}
      </Text>
      {hint && (
        <Text c="dimmed" size="sm" maw={340}>
          {hint}
        </Text>
      )}
      {action}
    </Stack>
  );
}
