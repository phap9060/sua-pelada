import { useState } from "react";
import { Button, Group, Modal, Stack, Text, type ButtonProps } from "@mantine/core";

interface ConfirmButtonProps extends Omit<ButtonProps, "onClick" | "loading"> {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  /** isLoading do mutate — o botão externo mostra o loading e o modal fecha. */
  loading?: boolean;
  onConfirm: () => void;
}

/** Botão que pede confirmação em modal antes de executar ações destrutivas. */
export function ConfirmButton({
  title = "Tem certeza?",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmColor = "red",
  loading,
  onConfirm,
  children,
  variant,
  color,
  size,
  leftSection,
  disabled,
  ...rest
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        {...rest}
        variant={variant}
        color={color}
        size={size}
        leftSection={leftSection}
        disabled={disabled}
        loading={loading}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <Modal opened={open} onClose={() => setOpen(false)} title={title} centered size="sm">
        <Stack gap="md">
          <Text size="sm">{message}</Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="light" color="gray" onClick={() => setOpen(false)}>
              {cancelLabel}
            </Button>
            <Button
              color={confirmColor}
              loading={loading}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
