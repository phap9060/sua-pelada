import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Group, Stack, Tabs, Text, Title } from "@mantine/core";
import { usePelada } from "../../hooks/usePelada";
import { fmtEndTime, WEEKDAYS } from "../../utils/date";
import { ErrorBox } from "../../components/ui/ErrorBox";
import { Loading } from "../../components/ui/Loading";
import { GameTab } from "./GameTab";
import { MembersTab } from "./MembersTab";
import { StatsTab } from "./StatsTab";
import { ConfigTab } from "./ConfigTab";

type Tab = "jogo" | "membros" | "stats" | "config";

export function PeladaDetail() {
  const { id = "" } = useParams();
  const { data: detail, isLoading, isError, error } = usePelada(id);
  const [tab, setTab] = useState<Tab>("jogo");

  if (isLoading) return <Loading />;
  if (isError) return <ErrorBox error={error} />;
  if (!detail) return <Loading />;

  const { pelada, myRole, members } = detail;
  const isManager = myRole === "manager";
  const canManage = myRole !== "member";

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

      <Tabs value={tab} onChange={(v) => setTab((v ?? "jogo") as Tab)} variant="pills" className="sp-tabs">
        <Tabs.List>
          <Tabs.Tab value="jogo">Jogo</Tabs.Tab>
          <Tabs.Tab value="membros">Membros</Tabs.Tab>
          <Tabs.Tab value="stats">Estatísticas</Tabs.Tab>
          {canManage && <Tabs.Tab value="config">Configurar</Tabs.Tab>}
        </Tabs.List>
      </Tabs>

      {tab === "jogo" && <GameTab peladaId={pelada.id} peladaName={pelada.name} canManage={canManage} />}
      {tab === "membros" && <MembersTab detail={detail} />}
      {tab === "stats" && <StatsTab peladaId={pelada.id} />}
      {tab === "config" && canManage && <ConfigTab detail={detail} />}
    </Stack>
  );
}
