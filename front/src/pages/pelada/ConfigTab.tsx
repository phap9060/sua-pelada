import { Button, Card, Group, NumberInput, Select, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useUpdatePelada } from "../../hooks/usePelada";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { WEEKDAYS } from "../../utils/date";
import type { PeladaDetail } from "../../types";

const weekdayData = WEEKDAYS.map((w, i) => ({ value: String(i), label: w }));

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
      gameWeekday: String(p.gameWeekday),
      gameTime: p.gameTime,
      gameDuration: p.gameDuration,
      confirmOpenWeekday: String(p.confirmOpenWeekday),
      confirmOpenTime: p.confirmOpenTime,
      confirmCloseWeekday: String(p.confirmCloseWeekday),
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
      gameWeekday: Number(values.gameWeekday),
      confirmOpenWeekday: Number(values.confirmOpenWeekday),
      confirmCloseWeekday: Number(values.confirmCloseWeekday),
    });
  });

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder maw={640}>
      <Title order={3} mb="md">
        Configurar pelada
      </Title>
      {update.isError && <ErrorBox error={update.error} />}
      <form onSubmit={submit}>
        <Stack gap="md">
          <TextInput label="Nome" {...form.getInputProps("name")} maxLength={80} />
          <Group grow>
            <NumberInput label="Vagas de linha" min={2} max={50} {...form.getInputProps("listCapacity")} />
            <NumberInput label="Vagas de goleiro" min={0} max={50} {...form.getInputProps("keeperCapacity")} />
          </Group>
          <NumberInput label="Jogadores por time" min={2} max={15} maw={200} {...form.getInputProps("playersPerTeam")} />
          <Group grow>
            <Select label="Dia do jogo" data={weekdayData} {...form.getInputProps("gameWeekday")} />
            <TextInput label="Hora do jogo" type="time" {...form.getInputProps("gameTime")} />
            <NumberInput label="Duração (min)" min={15} max={480} step={15} {...form.getInputProps("gameDuration")} />
          </Group>
          <Group grow>
            <Select label="Botão abre (dia)" data={weekdayData} {...form.getInputProps("confirmOpenWeekday")} />
            <TextInput label="Hora" type="time" {...form.getInputProps("confirmOpenTime")} />
          </Group>
          <Group grow>
            <Select label="Botão fecha (dia)" data={weekdayData} {...form.getInputProps("confirmCloseWeekday")} />
            <TextInput label="Hora" type="time" {...form.getInputProps("confirmCloseTime")} />
          </Group>
          <Button type="submit" fullWidth loading={update.isPending}>
            Salvar
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
