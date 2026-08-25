import { Chip, Group } from "@mantine/core";

const DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface WeekdayPickerProps {
  value: number;
  onChange: (v: number) => void;
}

/** Seleção de dia da semana em pílulas — mais rápida que um select. */
export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  return (
    <Chip.Group value={String(value)} onChange={(v) => onChange(Number(v))}>
      <Group gap={6} wrap="nowrap" justify="space-between">
        {DAYS.map((d) => (
          <Chip key={d.value} value={String(d.value)} radius="md" size="sm" styles={{ label: { flex: 1 } }}>
            {d.label}
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  );
}