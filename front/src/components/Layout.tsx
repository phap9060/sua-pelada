import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShell, Badge, Burger, Button, Container, Group, NavLink, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBallFootball, IconBell, IconHome, IconLogout, IconStar } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { usePendingRatings } from "../hooks/useRatings";

export function Layout() {
  const [opened, { toggle }] = useDisclosure();
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

  const navLink = (
    to: string,
    label: string,
    icon: React.ReactNode,
    badge?: number
  ) => (
    <NavLink
      component={Link}
      to={to}
      label={label}
      leftSection={icon}
      active={path === to}
      rightSection={
        badge != null && badge > 0 ? (
          <Badge color="red" size="xs" circle>
            {badge}
          </Badge>
        ) : undefined
      }
    />
  );

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Link to="/" style={{ textDecoration: "none" }}>
              <Group gap={8}>
                <IconBallFootball size={26} stroke={1.5} style={{ color: "var(--mantine-color-grass-5)" }} />
                <Text fw={400} size="lg" c="grass.4" style={{ fontFamily: "Bungee, system-ui, sans-serif", letterSpacing: "0.02em" }}>
                  SUA PELADA
                </Text>
              </Group>
            </Link>
          </Group>
          <Group gap="md">
            <Text c="dimmed" size="sm" visibleFrom="sm">
              {user.name}
            </Text>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconLogout size={14} />}
              onClick={() => logout().then(() => navigate("/login"))}
            >
              Sair
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {navLink("/", "Início", <IconHome size={18} />)}
        {navLink("/avaliacoes", "Avaliações", <IconStar size={18} />, pending)}
        {navLink("/notificacoes", "Notificações", <IconBell size={18} />, unread)}
        <AppShell.Section mt="auto">
          <Text c="dimmed" size="xs" ta="center" p="sm">
            {user.name}
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main className="pitch-bg">
        <Container size="md">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
