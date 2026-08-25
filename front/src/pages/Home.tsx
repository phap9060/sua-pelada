import { Link } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Card,
  CopyButton,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBallFootball,
  IconCheck,
  IconCopy,
  IconPlus,
} from "@tabler/icons-react";
import { useMine } from "../hooks/useMine";
import { useAuth } from "../hooks/useAuth";
import { refsOf, useNextGame } from "../hooks/useNextGame";
import { GameHero } from "../components/game/GameHero";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBox } from "../components/ui/ErrorBox";
import { GameHeroSkeleton, CardSkeleton } from "../components/ui/Skeletons";
import { WEEKDAYS } from "../utils/date";

export function Home() {
  const { user } = useAuth();
  const { data: mine, isLoading, isError, error } = useMine();
  const next = useNextGame(mine);
  const canManage = user?.canManage ?? false;

  if (isLoading) return <Stack gap="md"><GameHeroSkeleton /><CardSkeleton lines={1} /></Stack>;
  if (isError) return <ErrorBox error={error} />;
  if (!mine) return null;

  const peladas = refsOf(mine);

  return (
    <Stack gap="xl">
      {/* ---- herói: o próximo jogo e o botão ---- */}
      {next.isLoading && <GameHeroSkeleton />}
      {next.data && (
        <GameHero game={next.data.game} peladaId={next.data.pelada.id} peladaName={next.data.pelada.name} />
      )}
      {!next.isLoading && !next.data && peladas.length > 0 && (
        <Card withBorder padding="lg">
          <EmptyState
            icon={<IconBallFootball size={34} stroke={1.4} />}
            title="Sem jogo agendado por enquanto"
            hint="Aguarde o manager configurar a próxima rodada."
          />
        </Card>
      )}

      {/* ---- minhas peladas ---- */}
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={3} fz="lg">
            Minhas peladas
          </Title>
          {canManage && !mine.managed && (
            <Button component={Link} to="/peladas/new" variant="light" size="compact-sm" leftSection={<IconPlus size={14} />}>
              Criar pelada
            </Button>
          )}
        </Group>

        {peladas.length === 0 && (
          <Card withBorder padding="lg">
            <EmptyState
              icon={<IconBallFootball size={34} stroke={1.4} />}
              title="Você ainda não joga em nenhuma pelada"
              hint="Peça o link de convite ao manager da sua turma — ou crie a sua."
              action={
                canManage ? (
                  <Button component={Link} to="/peladas/new" leftSection={<IconPlus size={16} />} mt="xs">
                    Criar minha pelada
                  </Button>
                ) : undefined
              }
            />
          </Card>
        )}

        {peladas.map((p) => {
          const isManaged = mine.managed?.id === p.id;
          const inviteUrl = `${window.location.origin}/invite/${mine.managed?.inviteToken ?? ""}`;
          return (
            <Card key={p.id} withBorder padding="md" component={Link} to={`/peladas/${p.id}`} style={{ textDecoration: "none" }}>
              <Group justify="space-between" wrap="nowrap">
                <Box style={{ minWidth: 0 }}>
                  <Group gap="xs" wrap="nowrap">
                    <Text fw={700} size="md" truncate>
                      {p.name}
                    </Text>
                    {isManaged && (
                      <Badge color="refletor" variant="light" size="xs">
                        manager
                      </Badge>
                    )}
                  </Group>
                  <Text c="dimmed" size="sm" className="digits">
                    {WEEKDAYS[p.gameWeekday]} · {p.gameTime}
                  </Text>
                </Box>
                <Group gap="xs" wrap="nowrap">
                  {isManaged && (
                    <CopyButton value={inviteUrl}>
                      {({ copied, copy }) => (
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          onClick={(e) => {
                            e.preventDefault();
                            copy();
                          }}
                          leftSection={copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                        >
                          {copied ? "Copiado" : "Convite"}
                        </Button>
                      )}
                    </CopyButton>
                  )}
                </Group>
              </Group>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
