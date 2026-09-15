import { useNavigate } from "react-router-dom";
import { Box, Button, Card, Group, NumberInput, Stack, Switch, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconLock } from "@tabler/icons-react";
import { useCreatePelada } from "../hooks/useCreatePelada";
import { useAuth } from "../hooks/useAuth";
import { BallRating } from "../components/BallRating";
import { WeekdayPicker } from "../components/ui/WeekdayPicker";
import { ErrorBox } from "../components/ui/ErrorBox";
import { WEEKDAYS } from "../utils/date";

export function CreatePelada() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const create = useCreatePelada();
  const canManage = user?.canManage ?? false;

  const form = useForm({
    initialValues: {
      name: "",
      selfRating: 3,
      listCapacity: 18,
      keeperCapacity: 3,
      playersPerTeam: 5,
      gameWeekday: 2,
      gameTime: "19:00",
      gameDuration: 120,
      confirmOpenWeekday: 2,
      confirmOpenTime: "08:00",
      confirmCloseWeekday: 2,
      confirmCloseTime: "18:00",
      useExternalList: false,
    },
    validate: {
      name: (v) => (v.trim().length >= 2 ? null : "Informe o nome da pelada"),
      listCapacity: (v) => (v >= 2 && v <= 50 ? null : "Vagas entre 2 e 50"),
      keeperCapacity: (v) => (v >= 0 && v <= 50 ? null : "Vagas entre 0 e 50"),
      playersPerTeam: (v) => (v >= 2 && v <= 15 ? null : "Jogadores por time entre 2 e 15"),
    },
  });

  const submit = form.onSubmit((values) => {
    create.mutate(
      {
        ...values,
        listCapacity: Number(values.listCapacity),
        keeperCapacity: Number(values.keeperCapacity),
        playersPerTeam: Number(values.playersPerTeam),
      },
      { onSuccess: (pelada) => navigate(`/peladas/${pelada.id}`) }
    );
  });

  const v = form.values;

  if (!canManage) {
    return (
      <Card shadow="sm" padding="xl" radius="lg" withBorder maw={640} mx="auto">
        <Stack align="center" gap="sm" py="lg">
          <IconLock size={40} style={{ color: "var(--sp-chalk-dim)" }} />
          <Title order={3} ta="center">
            Acesso restrito
          </Title>
          <Text c="dimmed" ta="center">
            Você não tem permissão para gerenciar uma pelada.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="md" maw={640} mx="auto">
      <div>
        <Title order={1} fz={28}>
          Criar minha pelada
        </Title>
        <Text c="dimmed" size="sm">
          Configure o dia, a vaga e a janela de confirmação. O resto a gente organiza.
        </Text>
      </div>

      {/* resumo vivo */}
      <Card shadow="sm" padding="md" radius="lg" withBorder>
        <Text size="sm" className="digits" fz={17}>
          Toda {WEEKDAYS[v.gameWeekday].toLowerCase()} às {v.gameTime} · {v.playersPerTeam} por time ·{" "}
          {v.listCapacity} vagas de linha + {v.keeperCapacity} goleiros
        </Text>
        <Text c="dimmed" size="xs" mt={2}>
          Confirmação abre {WEEKDAYS[v.confirmOpenWeekday].toLowerCase()} às {v.confirmOpenTime} e fecha{" "}
          {WEEKDAYS[v.confirmCloseWeekday].toLowerCase()} às {v.confirmCloseTime}
        </Text>
      </Card>

      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        {create.isError && <ErrorBox error={create.error} />}
        <form onSubmit={submit}>
          <Stack gap="xl">
            <Stack gap="md">
              <div>
                <Text size="sm" fw={500} mb={6}>
                  Nome da pelada
                </Text>
                <TextInput placeholder="Ex.: Terça dos Cracks" {...form.getInputProps("name")} maxLength={80} />
              </div>

              <div>
                <Text size="sm" fw={500} mb={6}>
                  Sua autoavaliação (nota inicial)
                </Text>
                <BallRating value={v.selfRating} onChange={(x) => form.setFieldValue("selfRating", x)} size={36} />
              </div>
            </Stack>

            <hr className="chalk-rule" />

            <Stack gap="md">
              <Text className="eyebrow">Vagas</Text>
              <Group grow>
                <NumberInput label="Linha" min={2} max={50} {...form.getInputProps("listCapacity")} />
                <NumberInput label="Goleiros" min={0} max={50} {...form.getInputProps("keeperCapacity")} />
              </Group>
              <NumberInput label="Jogadores por time" min={2} max={15} maw={200} {...form.getInputProps("playersPerTeam")} />
            </Stack>

            <hr className="chalk-rule" />

            <Stack gap="md">
              <Text className="eyebrow">Dia do jogo</Text>
              <WeekdayPicker value={v.gameWeekday} onChange={(x) => form.setFieldValue("gameWeekday", x)} />
              <Group grow>
                <TextInput label="Horário" type="time" {...form.getInputProps("gameTime")} />
                <NumberInput label="Duração (min)" min={15} max={480} step={15} {...form.getInputProps("gameDuration")} />
              </Group>
            </Stack>

            <hr className="chalk-rule" />

            <Stack gap="md">
              <Text className="eyebrow">Confirmação de presença</Text>
              <Switch
                label="Usar lista externa"
                description="Em vez do botão de presença, você digita quem vai jogar (membros ou convidados) e sorteia os times manualmente."
                checked={v.useExternalList}
                onChange={(e) => form.setFieldValue("useExternalList", e.currentTarget.checked)}
              />
              {!v.useExternalList && (
                <>
              <div>
                <Text size="sm" c="dimmed" mb={6}>
                  Abre
                </Text>
                <WeekdayPicker value={v.confirmOpenWeekday} onChange={(x) => form.setFieldValue("confirmOpenWeekday", x)} />
                <Box mt={6}>
                  <TextInput label="Hora" type="time" {...form.getInputProps("confirmOpenTime")} />
                </Box>
              </div>
              <div>
                <Text size="sm" c="dimmed" mb={6}>
                  Fecha
                </Text>
                <WeekdayPicker value={v.confirmCloseWeekday} onChange={(x) => form.setFieldValue("confirmCloseWeekday", x)} />
                <Box mt={6}>
                  <TextInput label="Hora" type="time" {...form.getInputProps("confirmCloseTime")} />
                </Box>
              </div>
              <Text c="dimmed" size="sm">
                No fechamento, o sorteio balanceado dos times acontece automaticamente.
              </Text>
                </>
              )}
              {v.useExternalList && (
                <Text c="dimmed" size="sm">
                  A janela de confirmação e o botão de presença ficam desativados. Membros entram pela média de bolas; convidados recebem
                  uma nota só para dividir os times.
                </Text>
              )}
            </Stack>

            <Button type="submit" fullWidth size="md" loading={create.isPending}>
              Criar pelada
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}