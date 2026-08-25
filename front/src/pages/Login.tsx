import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { authService } from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import { ErrorBox } from "../components/ui/ErrorBox";
import { AuthShell } from "../components/AuthShell";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await authService.login({ email, password });
      setUser(user);
      navigate(sessionStorage.getItem("postAuthRedirect") ?? "/", { replace: true });
      sessionStorage.removeItem("postAuthRedirect");
    } catch (err) {
      setError(err);
    }
  };

  return (
    <AuthShell>
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
