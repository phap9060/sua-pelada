import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * NOITE DE JOGO — sistema de identidade visual do Sua Pelada.
 *
 * Papéis fixos:
 * - grass    → ação primária, status "aberto", presença confirmada
 * - pitch    → superfícies (o dark tuple inteiro é o gramado noturno)
 * - refletor → âmbar de holofote, EXCLUSIVO de campeões/títulos
 * - terra    → terra de campo seco, detalhes secundários
 * - botao    → vermelho físico, EXCLUSIVO do botão de presença
 */

/** Grama viva — verde do gramado sob luz. */
const grass: MantineColorsTuple = [
  "#eefbf0",
  "#d5f6dd",
  "#b0eec0",
  "#85e39f",
  "#5bd77d",
  "#3acb62",
  "#22c55e",
  "#1aa94f",
  "#178a41",
  "#0e5c2b",
];

/** Pitch — verde-noite profundo. Substitui o dark padrão do Mantine para que
 *  todo componente escuro nasça com a cor do gramado à noite. */
const pitch: MantineColorsTuple = [
  "#edf4ee",
  "#d0ded3",
  "#a9c2b0",
  "#7fa38a",
  "#5b8668",
  "#41694f",
  "#2f523c",
  "#223f2e",
  "#182f22",
  "#0f2016",
];

/** Âmbar de holofote — momentos de ouro. */
const refletor: MantineColorsTuple = [
  "#fff8e6",
  "#ffedc2",
  "#ffe193",
  "#ffd35c",
  "#ffc531",
  "#ffb020",
  "#e69707",
  "#b97a04",
  "#8a5c03",
  "#5c3d01",
];

/** Terra de campo seco. */
const terra: MantineColorsTuple = [
  "#f7f1ea",
  "#e5d8cb",
  "#cdb39c",
  "#b28e70",
  "#9a704f",
  "#7d5538",
  "#64422c",
  "#4d3220",
  "#3d2b1f",
  "#2a1d14",
];

export const theme = createTheme({
  primaryColor: "grass",
  primaryShade: 6,
  colors: { grass, pitch, refletor, terra },
  defaultRadius: "md",
  autoContrast: true,
  fontFamily: "'Barlow', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontFamilyMonospace: "ui-monospace, 'SFMono-Regular', Menlo, monospace",
  headings: {
    // Bungee fica restrito a logo/momentos épicos via .display;
    // títulos de página usam Barlow pesado com aperto de tracking esportivo.
    fontFamily: "'Barlow', system-ui, sans-serif",
    fontWeight: "800",
  },
  defaultGradient: { from: "grass.6", to: "grass.8", deg: 120 },
  components: {
    Card: { defaultProps: { radius: "lg" } },
    Button: { defaultProps: { radius: "md" } },
  },
});
