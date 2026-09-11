import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge, Group, Stack, Tabs, Text, Title } from "@mantine/core";
import { usePelada } from "../../hooks/usePelada";
import { fmtEndTime, WEEKDAYS } from "../../utils/date";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { Loading } from "../../components/ui/Loading";
import type { PeladaDetail as PeladaDetailData } from "../../types";

export type PeladaOutletContext = { detail: PeladaDetailData; canManage: boolean };

type Tab = "jogo" | "campeonato" | "membros" | "stats" | "config";

const TAB_BY_SLUG: Record<string, Tab> = {
  "": "jogo",
  campeonato: "campeonato",
  membros: "membros",
  estatisticas: "stats",
  configurar: "config",
};

const PATH_BY_TAB: Record<Tab, string> = {
  jogo: "",
  campeonato: "/campeonato",
  membros: "/membros",
  stats: "/estatisticas",
  config: "/configurar",
};

/** Layout da pelada: cabeçalho + abas por rota + Outlet com o contexto compartilhado. */
export function PeladaDetail() {
  const { id = "" } = useParams();
  const { data: detail, isLoading, isError, error } = usePelada(id);
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  if (!detail) return <Loading />;

  const { pelada, myRole, members } = detail;
  const isManager = myRole === "manager";
  const canManage = myRole !== "member";

  // slug da URL → aba ativa; slug desconhecido ou "configurar" sem permissão volta para a raiz
  const seg = location.pathname.split("/").filter(Boolean)[2] ?? "";
  const tab = TAB_BY_SLUG[seg];
  if (!tab || (tab === "config" && !canManage)) return <Navigate to={`/peladas/${pelada.id}`} replace />;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="nowrap" gap="sm">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text className="eyebrow">Pelada</Text>
          <Title order={1} fz={{ base: 26, sm: 32 }} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {pelada.name}
          </Title>
          <Group gap="xs" wrap="nowrap">
            <Text c="dimmed" size="sm" className="digits">
              {WEEKDAYS[pelada.gameWeekday]} · {pelada.gameTime}–{fmtEndTime(pelada.gameTime, pelada.gameDuration)}
            </Text>
            <Text c="dimmed" size="sm">
              · {members.length}/50
            </Text>
          </Group>
        </Stack>
        <Badge color={isManager ? "refletor" : "grass"} variant="light" style={{ flex: "none" }}>
          {isManager ? "manager" : myRole === "assistant" ? "auxiliar" : "jogador"}
        </Badge>
      </Group>

      <Tabs
        value={tab}
        onChange={(v) => navigate(`/peladas/${pelada.id}${PATH_BY_TAB[(v ?? "jogo") as Tab]}`)}
        variant="pills"
        className="sp-tabs"
      >
        <Tabs.List>
          <Tabs.Tab value="jogo">Jogo</Tabs.Tab>
          <Tabs.Tab value="campeonato">Campeonato</Tabs.Tab>
          <Tabs.Tab value="membros">Membros</Tabs.Tab>
          <Tabs.Tab value="stats">Estatísticas</Tabs.Tab>
          {canManage && <Tabs.Tab value="config">Configurar</Tabs.Tab>}
        </Tabs.List>
      </Tabs>

      <Outlet context={{ detail, canManage } satisfies PeladaOutletContext} />
    </Stack>
  );
}
