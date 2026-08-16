import { useNavigate } from "react-router-dom";
import { Button, Card, Group, NumberInput, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconLock } from "@tabler/icons-react";
import { useCreatePelada } from "../hooks/useCreatePelada";
import { useAuth } from "../hooks/useAuth";
import { BallRating } from "../components/BallRating";
import { ErrorBox } from "../components/ui/ErrorBox";
import { WEEKDAYS } from "../utils/date";

const weekdayData = WEEKDAYS.map((w, i) => ({ value: String(i), label: w }));

export function CreatePelada() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const create = useCreatePelada();
  const canManage = user?.canManage ?? false;

  const form = useForm({
    initialValues: {
      name: "",
      selfRating: 3,
      listCapacity: 20,
      playersPerTeam: 5,
      gameWeekday: "2",
      gameTime: "19:00",
      confirmOpenWeekday: "2",
      confirmOpenTime: "08:00",
      confirmCloseWeekday: "2",
      confirmCloseTime: "18:00",
    },
    validate: {
      name: (v) => (v.trim().length >= 2 ? null : "Informe o nome da pelada"),
      listCapacity: (v) => (v >= 2 && v <= 50 ? null : "Vagas entre 2 e 50"),
      playersPerTeam: (v) => (v >= 2 && v <= 15 ? null : "Jogadores por time entre 2 e 15"),
    },
  });

  const submit = form.onSubmit((values) => {
    create.mutate(
      {
        ...values,
        listCapacity: Number(values.listCapacity),
        playersPerTeam: Number(values.playersPerTeam),
        gameWeekday: Number(values.gameWeekday),
        confirmOpenWeekday: Number(values.confirmOpenWeekday),
        confirmCloseWeekday: Number(values.confirmCloseWeekday),
      },
      { onSuccess: (pelada) => navigate(`/peladas/${pelada.id}`) }
    );
  });

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder maw={640} mx="auto">
      {!canManage ? (
        <Stack align="center" gap="sm" py="lg">
          <IconLock size={40} style={{ color: "var(--mantine-color-dimmed)" }} />
          <Title order={3} ta="center">
            Acesso restrito
          </Title>
          <Text c="dimmed" ta="center">
            Você não tem permissão para gerenciar uma pelada.
          </Text>
        </Stack>
      ) : (
        <>
          <Title order={2} mb="md">
            Criar minha pelada
          </Title>
          {create.isError && <ErrorBox error={create.error} />}
          <form onSubmit={submit}>
            <Stack gap="md">
              <TextInput label="Nome da pelada" {...form.getInputProps("name")} maxLength={80} />

              <div>
                <Text size="sm" c="dimmed" mb={6}>
                  Sua autoavaliação (nota inicial)
                </Text>
                <BallRating value={form.values.selfRating} onChange={(v) => form.setFieldValue("selfRating", v)} size={36} />
              </div>

              <Group grow>
                <NumberInput label="Vagas na lista (titulares)" min={2} max={50} {...form.getInputProps("listCapacity")} />
                <NumberInput label="Jogadores por time" min={2} max={15} {...form.getInputProps("playersPerTeam")} />
              </Group>

              <Title order={4}>Jogo semanal</Title>
              <Group grow>
                <Select label="Dia do jogo" data={weekdayData} {...form.getInputProps("gameWeekday")} />
                <TextInput label="Horário" type="time" {...form.getInputProps("gameTime")} />
              </Group>

              <Title order={4}>Confirmação de presença</Title>
              <Group grow>
                <Select label="Botão abre (dia)" data={weekdayData} {...form.getInputProps("confirmOpenWeekday")} />
                <TextInput label="Hora" type="time" {...form.getInputProps("confirmOpenTime")} />
              </Group>
              <Group grow>
                <Select label="Botão fecha (dia)" data={weekdayData} {...form.getInputProps("confirmCloseWeekday")} />
                <TextInput label="Hora" type="time" {...form.getInputProps("confirmCloseTime")} />
              </Group>

              <Text c="dimmed" size="sm">
                No fechamento, o sorteio balanceado dos times acontece automaticamente.
              </Text>

              <Button type="submit" fullWidth loading={create.isPending}>
                Criar pelada
              </Button>
            </Stack>
          </form>
        </>
      )}
    </Card>
  );
}
