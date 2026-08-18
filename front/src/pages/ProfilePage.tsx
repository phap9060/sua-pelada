import { Button, Card, Group, SegmentedControl, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBallFootball } from "@tabler/icons-react";
import { useAuth, useUpdateProfile } from "../hooks/useAuth";
import { BallRating } from "../components/BallRating";
import { GloveIcon } from "../components/GloveIcon";
import { ErrorBox } from "../components/ui/ErrorBox";
import type { PlayerPosition } from "../types";

export function ProfilePage() {
  const { user } = useAuth();
  const update = useUpdateProfile();

  const form = useForm({
    initialValues: {
      name: user?.name ?? "",
      position: (user?.position ?? "line") as PlayerPosition,
      selfRating: user?.selfRating ?? 3,
    },
    validate: {
      name: (v) => (v.trim().length >= 2 ? null : "Informe um nome (mín. 2 caracteres)"),
    },
  });

  const submit = form.onSubmit((values) => {
    update.mutate({ ...values, position: values.position as PlayerPosition });
  });

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder maw={640}>
      <Title order={2} mb="md">
        Seu perfil
      </Title>
      {update.isError && <ErrorBox error={update.error} />}
      <form onSubmit={submit}>
        <Stack gap="md">
          <TextInput label="Nome / apelido" {...form.getInputProps("name")} maxLength={80} />

          <div>
            <Text size="sm" fw={500} mb={6}>
              Sua posição
            </Text>
            <SegmentedControl
              fullWidth
              value={form.values.position}
              onChange={(v) => form.setFieldValue("position", v as PlayerPosition)}
              data={[
                {
                  value: "line",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconBallFootball size={16} stroke={1.5} />
                      <span>Linha</span>
                    </Group>
                  ),
                },
                {
                  value: "keeper",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <GloveIcon size={16} />
                      <span>Goleiro</span>
                    </Group>
                  ),
                },
              ]}
            />
            <Text size="xs" c="dimmed" mt={6}>
              Define como você aparece nas listas e como é avaliado: bolas (linha) ou luvas (goleiro).
            </Text>
          </div>

          <div>
            <Text size="sm" fw={500} mb={6}>
              Nota pessoal
            </Text>
            <BallRating
              value={form.values.selfRating}
              onChange={(v) => form.setFieldValue("selfRating", v)}
              size={36}
              position={form.values.position}
            />
            <Text size="xs" c="dimmed" mt={6}>
              Vale para todas as peladas que você joga: é a nota usada no sorteio enquanto os outros ainda não te
              avaliaram.
            </Text>
          </div>

          <Button type="submit" fullWidth loading={update.isPending}>
            Salvar perfil
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
