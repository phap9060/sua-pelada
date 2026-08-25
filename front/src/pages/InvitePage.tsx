import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useAuth } from "../hooks/useAuth";
import { useInvite, useJoinPelada } from "../hooks/useInvite";
import { BallRating } from "../components/BallRating";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Loading } from "../components/ui/Loading";
import { EmptyState } from "../components/ui/EmptyState";
import { AuthShell } from "../components/AuthShell";

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
    <AuthShell>
      {isLoading && <Loading label="Abrindo o convite…" />}
      {isError && (
        <EmptyState title="Convite inválido" hint="Este link não é mais válido. Peça um novo ao manager da pelada." />
      )}
      {info && (
        <Stack gap="md" align="center">
          <Text className="eyebrow">Convite para a pelada</Text>
          <Title order={1} ta="center" fz={34}>
            {info.name}
          </Title>
          <Text c="dimmed" size="sm" className="digits" fz="lg">
            {info.membersCount}/{info.maxMembers} jogadores
          </Text>

          {!user ? (
            <>
              <Text ta="center" c="dimmed" size="sm">
                Crie sua conta ou entre para aceitar o convite.
              </Text>
              <Group w="100%" grow>
                <Button onClick={() => goToAuth("/register")} size="md">
                  Criar conta
                </Button>
                <Button variant="light" onClick={() => goToAuth("/login")} size="md">
                  Entrar
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Text ta="center" size="sm">
                Antes de entrar, sua <b>autoavaliação</b> — ela vira sua nota inicial:
              </Text>
              <BallRating value={selfRating} onChange={setSelfRating} size={40} position={user.position} />
              {join.isError && <ErrorBox error={join.error} />}
              <Button
                fullWidth
                size="md"
                loading={join.isPending}
                onClick={() => join.mutate(selfRating, { onSuccess: (p) => navigate(`/peladas/${p.id}`) })}
              >
                Entrar na pelada
              </Button>
            </>
          )}

          <Paper p="xs" radius="md" withBorder w="100%">
            <Text size="xs" c="dimmed" ta="center">
              Você confirma presença semanalmente no botão. Times saem balanceados pelas notas.
            </Text>
          </Paper>
        </Stack>
      )}
    </AuthShell>
  );
}
