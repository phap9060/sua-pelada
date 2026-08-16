import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Group, Tabs, Text, Title } from "@mantine/core";
import { usePelada } from "../../hooks/usePelada";
import { WEEKDAYS } from "../../utils/date";
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

  return (
    <>
      <Group justify="space-between" wrap="wrap" mb="md">
        <Title order={2}>
          {pelada.name}{" "}
          <Text component="span" c="dimmed" size="md" fw={400}>
            {WEEKDAYS[pelada.gameWeekday]} {pelada.gameTime} · {members.length}/50
          </Text>
        </Title>
        {isManager && <Badge color="yellow" variant="light">manager</Badge>}
      </Group>

      <Tabs value={tab} onChange={(v) => setTab((v ?? "jogo") as Tab)} variant="pills" mb="md">
        <Tabs.List>
          <Tabs.Tab value="jogo">Jogo</Tabs.Tab>
          <Tabs.Tab value="membros">Membros</Tabs.Tab>
          <Tabs.Tab value="stats">Estatísticas</Tabs.Tab>
          {isManager && <Tabs.Tab value="config">Configurar</Tabs.Tab>}
        </Tabs.List>
      </Tabs>

      {tab === "jogo" && <GameTab peladaId={pelada.id} isManager={isManager} listCapacity={pelada.listCapacity} />}
      {tab === "membros" && <MembersTab detail={detail} />}
      {tab === "stats" && <StatsTab peladaId={pelada.id} />}
      {tab === "config" && isManager && <ConfigTab detail={detail} />}
    </>
  );
}
