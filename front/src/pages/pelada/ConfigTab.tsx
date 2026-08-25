import { Box, Button, Card, Group, NumberInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useUpdatePelada } from "../../hooks/usePelada";
import { WeekdayPicker } from "../../components/ui/WeekdayPicker";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { WEEKDAYS } from "../../utils/date";
import type { PeladaDetail } from "../../types";

interface Props {
  detail: PeladaDetail;
}

export function ConfigTab({ detail }: Props) {
  const p = detail.pelada;
  const update = useUpdatePelada(p.id);

  const form = useForm({
    initialValues: {
      name: p.name,
      listCapacity: p.listCapacity,
      keeperCapacity: p.keeperCapacity,
      playersPerTeam: p.playersPerTeam,
      gameWeekday: p.gameWeekday,
      gameTime: p.gameTime,
      gameDuration: p.gameDuration,
      confirmOpenWeekday: p.confirmOpenWeekday,
      confirmOpenTime: p.confirmOpenTime,
      confirmCloseWeekday: p.confirmCloseWeekday,
      confirmCloseTime: p.confirmCloseTime,
    },
    validate: {
      name: (v) => (v.trim().length >= 2 ? null : "Informe o nome da pelada"),
      listCapacity: (v) => (v >= 2 && v <= 50 ? null : "Vagas entre 2 e 50"),
      keeperCapacity: (v) => (v >= 0 && v <= 50 ? null : "Vagas entre 0 e 50"),
      playersPerTeam: (v) => (v >= 2 && v <= 15 ? null : "Jogadores por time entre 2 e 15"),
    },
  });

  const submit = form.onSubmit((values) => {
    update.mutate({
      ...values,
      listCapacity: Number(values.listCapacity),
      keeperCapacity: Number(values.keeperCapacity),
      playersPerTeam: Number(values.playersPerTeam),
    });
  });

  const v = form.values;

  return (
    <Stack gap="md" maw={640}>
      <div>
        <Title order={3}>Configurar pelada</Title>
        <Text c="dimmed" size="sm">
          Tudo aqui vale para as próximas rodadas.
        </Text>
      </div>

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
        {update.isError && <ErrorBox error={update.error} />}
        <form onSubmit={submit}>
          <Stack gap="xl">
            <Stack gap="md">
              <TextInput label="Nome" {...form.getInputProps("name")} maxLength={80} />
              <Group grow>
                <NumberInput label="Vagas de linha" min={2} max={50} {...form.getInputProps("listCapacity")} />
                <NumberInput label="Vagas de goleiro" min={0} max={50} {...form.getInputProps("keeperCapacity")} />
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
            </Stack>

            <Button type="submit" fullWidth size="md" loading={update.isPending}>
              Salvar alterações
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}