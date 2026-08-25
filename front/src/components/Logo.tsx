/** Marca do Sua Pelada: bola em chip de grama + lettering de placa. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="sp-logo-g" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2fae52" />
          <stop offset="1" stopColor="#157a38" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#sp-logo-g)" />
      <rect x="1" y="1" width="46" height="46" rx="13" stroke="rgba(232,242,234,0.25)" strokeWidth="1.5" />
      {/* listra de gramado ao fundo */}
      <path d="M14 2h8L18 46h-8z" fill="rgba(10,20,13,0.14)" />
      <circle cx="24" cy="24" r="12.5" stroke="#f2faf4" strokeWidth="2" />
      <polygon points="24,17.5 29.9,21.8 27.7,28.7 20.3,28.7 18.1,21.8" fill="#f2faf4" />
      <g stroke="#f2faf4" strokeWidth="1.8">
        <path d="M24 11.5v6" />
        <path d="M35 19.5l-5.1 2.3" />
        <path d="M31.5 34.5l-3.8-5.8" />
        <path d="M16.5 34.5l3.8-5.8" />
        <path d="M13 19.5l5.1 2.3" />
      </g>
    </svg>
  );
}

export function Wordmark({ size = 15 }: { size?: number }) {
  return (
    <span
      className="display"
      style={{ fontSize: size, letterSpacing: "0.04em", color: "var(--mantine-color-grass-4)" }}
    >
      SUA PELADA
    </span>
  );
}
