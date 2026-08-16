import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Button, Center, Container, Group, Paper, PasswordInput, SegmentedControl, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconBallFootball } from "@tabler/icons-react";
import { authService } from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import { ErrorBox } from "../components/ui/ErrorBox";
import { GloveIcon } from "../components/GloveIcon";
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
    <div className="pitch-bg" style={{ minHeight: "100vh" }}>
      <Center style={{ minHeight: "100vh" }}>
        <Container size={420}>
          <Paper radius="lg" p="xl" withBorder shadow="md">
            <Stack gap="md">
              <Group justify="center" gap="sm">
                <IconBallFootball size={30} stroke={1.5} style={{ color: "var(--mantine-color-grass-5)" }} />
                <Title ta="center" order={2}>
                  SUA PELADA
                </Title>
              </Group>
              {error != null && <ErrorBox error={error} />}
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
                              <IconBallFootball size={16} stroke={1.5} />
                              <span>Jogador de linha</span>
                            </Group>
                          ),
                        },
                        {
                          value: "keeper",
                          label: (
                            <Group gap={6} wrap="nowrap">
                              <GloveIcon size={16} />
                              <span>Goleiro</span>
                            </Group>
                          ),
                        },
                      ]}
                    />
                    <Text size="xs" c="dimmed" mt={6}>
                      Define se você será avaliado com bolas (linha) ou luvas (goleiro).
                    </Text>
                  </div>
                  <Button type="submit" fullWidth>
                    Criar conta
                  </Button>
                </Stack>
              </form>
              <Text ta="center" c="dimmed" size="sm">
                Já tem conta?{" "}
                <Anchor component={Link} to="/login">
                  Entrar
                </Anchor>
              </Text>
            </Stack>
          </Paper>
        </Container>
      </Center>
    </div>
  );
}
