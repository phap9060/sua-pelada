import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { getErrorMessage } from "../../lib/request";

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} mb="sm">
      {getErrorMessage(error)}
    </Alert>
  );
}
