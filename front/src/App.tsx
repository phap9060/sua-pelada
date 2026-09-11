import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Loading } from "./components/ui/Loading";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

const lazyPage = (fn: () => Promise<{ [k: string]: unknown }>) => {
  const factory = async () => {
    const mod = await fn();
    const keys = Object.keys(mod);
    if (keys.length !== 1) throw new Error(`Página com múltiplos exports: ${keys.join(", ")}`);
    return { default: mod[keys[0]] as React.ComponentType };
  };
  return lazy(factory);
};

const Home = lazyPage(() => import("./pages/Home"));
const CreatePelada = lazyPage(() => import("./pages/CreatePelada"));
const InvitePage = lazyPage(() => import("./pages/InvitePage"));
const PeladaDetail = lazyPage(() => import("./pages/pelada/PeladaDetail"));
const GameTab = lazyPage(() => import("./pages/pelada/GameTab"));
const ChampionshipTab = lazyPage(() => import("./pages/pelada/ChampionshipTab"));
const MembersTab = lazyPage(() => import("./pages/pelada/MembersTab"));
const StatsTab = lazyPage(() => import("./pages/pelada/StatsTab"));
const ConfigTab = lazyPage(() => import("./pages/pelada/ConfigTab"));
const RatingsPage = lazyPage(() => import("./pages/RatingsPage"));
const NotificationsPage = lazyPage(() => import("./pages/NotificationsPage"));
const ProfilePage = lazyPage(() => import("./pages/ProfilePage"));

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<Loading />}>{node}</Suspense>;

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/invite/:token" element={withSuspense(<InvitePage />)} />
      <Route element={<Layout />}>
        <Route path="/" element={withSuspense(<Home />)} />
        <Route path="/perfil" element={withSuspense(<ProfilePage />)} />
        <Route path="/peladas/new" element={withSuspense(<CreatePelada />)} />
        {/* abas da pelada: uma rota por aba (deep-link, histórico e F5 mantêm a aba) */}
        <Route path="/peladas/:id" element={withSuspense(<PeladaDetail />)}>
          <Route index element={withSuspense(<GameTab />)} />
          <Route path="campeonato" element={withSuspense(<ChampionshipTab />)} />
          <Route path="membros" element={withSuspense(<MembersTab />)} />
          <Route path="estatisticas" element={withSuspense(<StatsTab />)} />
          <Route path="configurar" element={withSuspense(<ConfigTab />)} />
        </Route>
        <Route path="/avaliacoes" element={withSuspense(<RatingsPage />)} />
        <Route path="/notificacoes" element={withSuspense(<NotificationsPage />)} />
      </Route>
    </Routes>
  );
}
