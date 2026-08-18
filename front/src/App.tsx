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
        <Route path="/peladas/:id" element={withSuspense(<PeladaDetail />)} />
        <Route path="/avaliacoes" element={withSuspense(<RatingsPage />)} />
        <Route path="/notificacoes" element={withSuspense(<NotificationsPage />)} />
      </Route>
    </Routes>
  );
}
