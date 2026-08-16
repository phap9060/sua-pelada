import { createTheme, type MantineColorsTuple } from "@mantine/core";

/** Verde grama (cor primária) — tons mais claros que o tema antigo, lembrando gramado. */
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

export const theme = createTheme({
  primaryColor: "grass",
  colors: { grass, dark },
  defaultRadius: "md",
  autoContrast: true,
  fontFamily:
    "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  headings: { fontWeight: "800" },
});
