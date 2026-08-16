/** Luva de goleiro (SVG no estilo de traço do tabler). */
export function GloveIcon({ size = 28, color = "currentColor", stroke = 1.5 }: { size?: number; color?: string; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* pulso */}
      <path d="M9 21h6a3 3 0 0 0 3-3V9a5 5 0 0 0-10 0v6" />
      {/* polegar */}
      <path d="M9 15c0 1.7-1.3 3-3 3s-3-1.3-3-3c0-2.5 2-5 4.5-6.5" />
      {/* dedos */}
      <path d="M8 12V7a2 2 0 0 1 4 0v5" />
      <path d="M12 12V7a2 2 0 0 1 4 0v5" />
      <path d="M16 12v-1a2 2 0 0 1 4 0" />
    </svg>
  );
}
