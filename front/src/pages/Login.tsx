import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Button, Center, Container, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { authService } from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import { ErrorBox } from "../components/ui/ErrorBox";

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
    <div className="pitch-bg" style={{ minHeight: "100vh" }}>
      <Center style={{ minHeight: "100vh" }}>
        <Container size={420}>
          <Paper radius="lg" p="xl" withBorder shadow="md">
            <Stack gap="md">
              <Title ta="center" order={2}>
                ⚽ Sua Pelada
              </Title>
              {error != null && <ErrorBox error={error} />}
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
                  <Button type="submit" fullWidth>
                    Entrar
                  </Button>
                </Stack>
              </form>
              <Text ta="center" c="dimmed" size="sm">
                Não tem conta?{" "}
                <Anchor component={Link} to="/register">
                  Cadastre-se
                </Anchor>
              </Text>
            </Stack>
          </Paper>
        </Container>
      </Center>
    </div>
  );
}
