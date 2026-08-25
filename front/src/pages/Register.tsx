import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Button, Group, Paper, PasswordInput, SegmentedControl, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconBallFootball } from "@tabler/icons-react";
import { authService } from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import { ErrorBox } from "../components/ui/ErrorBox";
import { GloveIcon } from "../components/GloveIcon";
import { AuthShell } from "../components/AuthShell";
import type { PlayerPosition } from "../types";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [position, setPosition] = useState<PlayerPosition>("line");
  const [error, setError] = useState<unknown>(null);
  const [emailError, setEmailError] = useState("");
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    // mesmo critério do back: domínio precisa ter ponto (ex: 123@123.com)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("E-mail inválido. Use um formato como nome@dominio.com");
      return;
    }
    setEmailError("");
    try {
      const user = await authService.register({ name, email, password, position });
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
        Criar conta
      </Title>
      <Text c="dimmed" size="sm" mb="lg">
        Dois minutos e você já está na lista.
      </Text>
      {error != null && <ErrorBox error={error} />}
      <Paper radius="lg" p="xl" withBorder>
        <form onSubmit={submit}>
          <Stack gap="md">
            <TextInput
              label="Nome / apelido"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
            <TextInput
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              error={emailError || undefined}
              required
            />
            <PasswordInput
              label="Senha (mín. 6)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <div>
              <Text size="sm" fw={500} mb={6}>
                Sua posição
              </Text>
              <SegmentedControl
                fullWidth
                value={position}
                onChange={(v) => setPosition(v as PlayerPosition)}
                data={[
                  {
                    value: "line",
                    label: (
                      <Group gap={6} wrap="nowrap">
                        <IconBallFootball size={15} stroke={1.6} />
                        <span>Linha</span>
                      </Group>
                    ),
                  },
                  {
                    value: "keeper",
                    label: (
                      <Group gap={6} wrap="nowrap">
                        <GloveIcon size={15} />
                        <span>Goleiro</span>
                      </Group>
                    ),
                  },
                ]}
              />
              <Text size="xs" c="dimmed" mt={6}>
                Define se você é avaliado com bolas ou luvas. Dá pra trocar depois no perfil.
              </Text>
            </div>
            <Button type="submit" fullWidth size="md">
              Entrar em campo
            </Button>
          </Stack>
        </form>
      </Paper>
      <Text ta="center" c="dimmed" size="sm" mt="md">
        Já joga aqui?{" "}
        <Anchor component={Link} to="/login" fw={600}>
          Entrar
        </Anchor>
      </Text>
    </AuthShell>
  );
}
