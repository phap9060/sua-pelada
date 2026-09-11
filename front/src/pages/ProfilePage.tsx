import { Button, Card, Group, Select, SegmentedControl, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBallFootball, IconLogout } from "@tabler/icons-react";
import { useAuth, useUpdateProfile } from "../hooks/useAuth";
import { BallRating } from "../components/BallRating";
import { GloveIcon } from "../components/GloveIcon";
import { PlayerDot } from "../components/ui/PlayerRow";
import { fieldPositionLabel } from "../components/ui/FieldPositionBadge";
import { ErrorBox } from "../components/ui/ErrorBox";
import type { FieldPosition, PlayerPosition } from "../types";

const FIELD_OPTIONS: { value: FieldPosition; label: string }[] = [
  { value: "zagueiro", label: "Zagueiro" },
  { value: "meia", label: "Meia" },
  { value: "atacante", label: "Atacante" },
];

export function ProfilePage() {
  const { user, logout } = useAuth();
  const update = useUpdateProfile();

  const form = useForm({
    initialValues: {
      name: user?.name ?? "",
      position: (user?.position ?? "line") as PlayerPosition,
      fieldPosition: (user?.fieldPosition ?? "meia") as FieldPosition,
      fieldPositionSecondary: (user?.fieldPositionSecondary ?? "") as FieldPosition | "",
      selfRating: user?.selfRating ?? 3,
    },
    validate: {
      name: (v) => (v.trim().length >= 2 ? null : "Informe um nome (mín. 2 caracteres)"),
      fieldPositionSecondary: (v, values) =>
        v && v === values.fieldPosition ? "A secundária tem que ser diferente da preferencial" : null,
    },
  });

  const submit = form.onSubmit((values) => {
    update.mutate({
      name: values.name,
      position: values.position as PlayerPosition,
      fieldPosition: values.fieldPosition,
      fieldPositionSecondary: values.fieldPositionSecondary || null,
      selfRating: values.selfRating,
    });
  });

  const isLine = form.values.position === "line";
  const headerPosition = isLine
    ? ["linha", fieldPositionLabel(form.values.fieldPosition, form.values.fieldPositionSecondary || null)].filter(Boolean).join(" · ")
    : "goleiro";

  return (
    <Stack gap="md" maw={640}>
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Group gap="md" wrap="nowrap">
          <PlayerDot name={user?.name ?? "?"} position={form.values.position} />
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Title order={2} fz={26} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name}
            </Title>
            <Text c="dimmed" size="sm" className="digits">
              {headerPosition} · nota pessoal {form.values.selfRating.toFixed(1)}
            </Text>
          </Stack>
        </Group>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Title order={3} size="lg" mb="md">
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
                        <IconBallFootball size={15} stroke={1.6} />
                        <span>Linha</span>
                      </Group>
                    ),
                  },
                  {
                    value: "keeper",
                    label: (
                      <Group gap={6} wrap="nowrap">
                        <GloveIcon size={15} />
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

            {isLine && (
              <Group grow align="flex-start">
                <Select
                  label="Posição preferencial"
                  data={FIELD_OPTIONS}
                  {...form.getInputProps("fieldPosition")}
                />
                <Select
                  label="Posição secundária"
                  placeholder="Opcional"
                  data={FIELD_OPTIONS}
                  clearable
                  {...form.getInputProps("fieldPositionSecondary")}
                />
              </Group>
            )}

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

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={0}>
            <Text fw={600}>Sair da conta</Text>
            <Text c="dimmed" size="xs">Encerra sua sessão neste aparelho.</Text>
          </Stack>
          <Button variant="light" color="red" leftSection={<IconLogout size={16} />} onClick={() => logout()}>
            Sair
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}