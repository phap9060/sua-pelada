import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Center, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useAuth } from "../hooks/useAuth";
import { useInvite, useJoinPelada } from "../hooks/useInvite";
import { BallRating } from "../components/BallRating";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Loading } from "../components/ui/Loading";

export function InvitePage() {
  const { token = "" } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selfRating, setSelfRating] = useState(3);
  const { data: info, isLoading, isError } = useInvite(token);
  const join = useJoinPelada(token);

  const goToAuth = (path: string) => {
    // guarda o caminho do convite (com token) para voltar após cadastro/login
    sessionStorage.setItem("postAuthRedirect", `/invite/${token}`);
    navigate(path);
  };

  useEffect(() => {
    if (!loading && !user) sessionStorage.setItem("postAuthRedirect", `/invite/${token}`);
  }, [loading, user, token]);

  return (
    <div className="pitch-bg" style={{ minHeight: "100vh" }}>
      <Center style={{ minHeight: "100vh" }}>
        <Container size={440}>
          <Paper radius="lg" p="xl" withBorder shadow="md">
            {isLoading && <Loading />}
            {isError && (
              <Text ta="center" c="dimmed">
                Convite inválido ou expirado.
              </Text>
            )}
            {info && (
              <Stack gap="md" align="center">
                <Title order={2} ta="center">
                  ⚽ {info.name}
                </Title>
                <Text c="dimmed">
                  {info.membersCount} de {info.maxMembers} jogadores
                </Text>
                {!user ? (
                  <>
                    <Text ta="center" c="dimmed" size="sm">
                      Para entrar nesta pelada, crie sua conta ou faça login:
                    </Text>
                    <Group>
                      <Button onClick={() => goToAuth("/register")}>Cadastrar</Button>
                      <Button variant="light" onClick={() => goToAuth("/login")}>
                        Entrar
                      </Button>
                    </Group>
                  </>
                ) : (
                  <>
                    <Text ta="center" size="sm">
                      Antes de entrar, faça sua <b>autoavaliação</b> (será sua nota inicial):
                    </Text>
                    <BallRating value={selfRating} onChange={setSelfRating} size={40} position={user.position} />
                    {join.isError && <ErrorBox error={join.error} />}
                    <Button
                      fullWidth
                      loading={join.isPending}
                      onClick={() => join.mutate(selfRating, { onSuccess: (p) => navigate(`/peladas/${p.id}`) })}
                    >
                      Entrar na pelada
                    </Button>
                  </>
                )}
              </Stack>
            )}
          </Paper>
        </Container>
      </Center>
    </div>
  );
}
