import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShell, Avatar, Badge, Container, Group, UnstyledButton } from "@mantine/core";
import { IconBell, IconHome, IconStar, IconUser } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { usePendingRatings } from "../hooks/useRatings";
import { initials } from "./ui/PlayerRow";
import { LogoMark, Wordmark } from "./Logo";

const NAV = [
  { to: "/", label: "Início", icon: IconHome },
  { to: "/avaliacoes", label: "Avaliações", icon: IconStar },
  { to: "/notificacoes", label: "Notificações", icon: IconBell },
  { to: "/perfil", label: "Perfil", icon: IconUser },
] as const;

export function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: notifications } = useNotifications();
  const { data: pendingRatings } = usePendingRatings();

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  const unread = notifications?.unreadCount ?? 0;
  const pending = pendingRatings?.length ?? 0;
  const path = location.pathname;
  const badgeOf = (to: string) => (to === "/avaliacoes" ? pending : to === "/notificacoes" ? unread : 0);

  return (
    <AppShell
      header={{ height: 60 }}
      footer={{ height: 66, offset: true }}
      padding="md"
    >
      <AppShell.Header style={{ borderBottom: "1px solid var(--sp-chalk-faint)", overflow: "hidden" }}>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <LogoMark size={34} />
            <Wordmark />
          </Link>

          {/* navegação horizontal no desktop */}
          <Group gap={2} visibleFrom="sm" wrap="nowrap">
            {NAV.map(({ to, label, icon: Icon }) => {
              const badge = badgeOf(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className="sp-nav-link"
                  data-active={path === to || undefined}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "8px 14px",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    color: path === to ? "var(--mantine-color-grass-4)" : "var(--sp-chalk-dim)",
                    background: path === to ? "rgba(34,197,94,0.12)" : "transparent",
                    border: "1px solid transparent",
                  }}
                >
                  <Icon size={17} stroke={1.7} />
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</span>
                  {badge > 0 && (
                    <Badge color="red" size="xs" circle variant="filled" p={0}>
                      {badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </Group>

          <UnstyledButton onClick={() => logout().then(() => navigate("/login"))} title={`Sair (${user.name})`}>
            <Avatar radius="xl" color="grass" variant="light" fw={700}>
              {initials(user.name)}
            </Avatar>
          </UnstyledButton>
        </Group>
      </AppShell.Header>

      {/* barra inferior no mobile: as quatro direções do app */}
      <AppShell.Footer zIndex={190} hiddenFrom="sm">
        <nav className="sp-tabbar" aria-label="Navegação principal">
          {NAV.map(({ to, label, icon: Icon }) => {
            const badge = badgeOf(to);
            return (
              <Link key={to} to={to} className="sp-tab" data-active={path === to || undefined}>
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Icon size={22} stroke={1.8} />
                  {badge > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -5,
                        right: -9,
                        minWidth: 16,
                        height: 16,
                        padding: "0 4px",
                        borderRadius: 999,
                        background: "#e03131",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
      </AppShell.Footer>

      <AppShell.Main className="pitch-bg">
        <Container size="md">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
