import { Button, Text } from "@mantine/core";

interface BigRedButtonProps {
  label: string;
  sublabel?: string;
  disabled?: boolean;
  inList?: boolean;
  pulse?: boolean;
  onClick?: () => void;
}

/** O botão gigante vermelho de confirmar presença. */
export function BigRedButton({ label, sublabel, disabled, inList, pulse, onClick }: BigRedButtonProps) {
  const cls = ["big-red", inList ? "in-list" : "", pulse ? "pulse" : ""].join(" ").trim();
  return (
    <div className="big-red-wrap">
      <Button className={cls} radius="xl" disabled={disabled} onClick={onClick}>
        {label}
      </Button>
      {sublabel && (
        <Text c="dimmed" size="sm" ta="center">
          {sublabel}
        </Text>
      )}
    </div>
  );
}
