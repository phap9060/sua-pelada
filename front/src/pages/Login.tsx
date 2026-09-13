import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Button, Modal, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { authService } from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import { ErrorBox } from "../components/ui/ErrorBox";
import { AuthShell } from "../components/AuthShell";

/** Modal não-fechável: a senha foi resetada pela organização — cria uma nova agora. */
function ResetPasswordModal({
  opened,
  onDone,
}: {
  opened: boolean;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const valid = password.length >= 6 && password === confirm;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await authService.setPassword({ password, confirm });
      notifications.show({ title: "Senha criada", message: "Essa é a sua nova senha de acesso.", color: "grass" });
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      title="Crie uma nova senha"
      centered
      withCloseButton={false}
      closeOnEscape={false}
      trapFocus
    >
      <Stack gap="md">
        <Text size="sm">Sua senha foi resetada. É necessário criar uma nova para continuar.</Text>
        {error != null && <ErrorBox error={error} />}
        <PasswordInput label="Nova senha" value={password} onChange={(e) => setPassword(e.currentTarget.value)} required />
        <PasswordInput label="Confirmar nova senha" value={confirm} onChange={(e) => setConfirm(e.currentTarget.value)} required />
        <Text c={valid ? "dimmed" : "red"} size="xs">
          {password.length === 0
            ? "Mínimo de 6 caracteres."
            : password.length < 6
              ? "Mínimo de 6 caracteres."
              : password !== confirm
                ? "As senhas não conferem."
                : "Pronto para salvar."}
        </Text>
        <Button color="grass" size="md" disabled={!valid} loading={saving} onClick={submit}>
          Salvar senha
        </Button>
      </Stack>
    </Modal>
  );
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [needsReset, setNeedsReset] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await authService.login({ email, password });
      if ("needsPasswordReset" in user && user.needsPasswordReset) {
        setNeedsReset(true);
        setUser(user);
        return;
      }
      setUser(user);
      navigate(sessionStorage.getItem("postAuthRedirect") ?? "/", { replace: true });
      sessionStorage.removeItem("postAuthRedirect");
    } catch (err) {
      setError(err);
    }
  };

  return (
    <AuthShell>
      <ResetPasswordModal
        opened={needsReset}
        onDone={() => {
          setNeedsReset(false);
          navigate(sessionStorage.getItem("postAuthRedirect") ?? "/", { replace: true });
          sessionStorage.removeItem("postAuthRedirect");
        }}
      />
      <Title order={1} fz={30} mb={4}>
        Bem-vindo de volta
      </Title>
      <Text c="dimmed" size="sm" mb="lg">
        Entre para garantir sua vaga no próximo jogo.
      </Text>
      {error != null && <ErrorBox error={error} />}
      <Paper radius="lg" p="xl" withBorder>
        <form onSubmit={submit}>
          <Stack gap="md">
            <TextInput
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              label="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth size="md">
              Entrar
            </Button>
          </Stack>
        </form>
      </Paper>
      <Text ta="center" c="dimmed" size="sm" mt="md">
        Primeira vez aqui?{" "}
        <Anchor component={Link} to="/register" fw={600}>
          Criar conta
        </Anchor>
      </Text>
    </AuthShell>
  );
}
