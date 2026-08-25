import { Group, Stack, Text } from "@mantine/core";
import { Link } from "react-router-dom";
import { LogoMark, Wordmark } from "./Logo";

interface AuthShellProps {
  children: React.ReactNode;
}

/**
 * Moldura das telas de entrada: painel de marca à esquerda (desktop),
 * formulário à direita; empilhado e centrado no mobile.
 */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="pitch-bg" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Group
        justify="space-between"
        px={{ base: "md", sm: "xl" }}
        py="md"
        wrap="nowrap"
        style={{ borderBottom: "1px solid var(--sp-chalk-faint)" }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <Group gap={10} wrap="nowrap">
            <LogoMark size={30} />
            <Wordmark size={13} />
          </Group>
        </Link>
        <Text size="xs" c="dimmed" className="digits">
          futebol de toda semana
        </Text>
      </Group>

      <div style={{ flex: 1, display: "flex", alignItems: "stretch" }}>
        {/* painel de marca — só desktop */}
        <div className="sp-brand-panel">
          <Text className="display" fz={42} lh={1.2} style={{ color: "var(--sp-chalk)" }} maw={480}>
            O time se arma sozinho.
          </Text>
          <hr className="chalk-rule" style={{ width: 120, margin: "28px 0" }} />
          <Stack gap={8} maw={420}>
            <Text c="dimmed" size="lg">
              Confirme presença no botão. No fechamento, os times saem balanceados pelas notas.
              Depois é só jogar — e consagrar quem merece.
            </Text>
          </Stack>
        </div>

        {/* formulário */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            minWidth: 0,
          }}
        >
          <div style={{ width: "100%", maxWidth: 400 }} className="page-enter">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
