import { createTheme, type MantineColorsTuple } from "@mantine/core";

/** Verde grama (cor primária) — tons claros lembrando gramado. */
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

/** Dark verde-escuro (gramado à noite). */
const dark: MantineColorsTuple = [
  "#f0f5f1",
  "#cfded3",
  "#a9c2b0",
  "#7fa38a",
  "#5b8668",
  "#3f6a4e",
  "#2b5139",
  "#1d3d2a",
  "#132b1e",
  "#0d1f15",
];

/** Âmbar de holofote — momentos de ouro (campeões, títulos). */
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

/** Terra de campo seco — superfícies secundárias. */
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
  colors: { grass, dark, refletor, terra },
  defaultRadius: "md",
  autoContrast: true,
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  // Display: Bungee (lettering de placa de pelada) — com restrição: logo, títulos e botão
  headings: { fontFamily: "Bungee, system-ui, sans-serif", fontWeight: "400" },
});
