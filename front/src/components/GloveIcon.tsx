/**
 * Luva de goleiro — ilustração em dois tons:
 * dedos brancos (`light`) e palma/punho/contornos na cor do clube (`color`).
 */
export function GloveIcon({
  size = 28,
  color = "currentColor",
  stroke = 26,
  light = "#f4faf6",
}: {
  size?: number;
  color?: string;
  stroke?: number;
  light?: string;
}) {
  const detail = stroke * 0.7;
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 500 600"
      fill="none"
      aria-hidden
    >
      {/* palma escura e punho na cor do clube */}
      <g fill={color}>
        <path d="M96 326C119 301 153 289 187 292C218 295 246 308 269 329L236 386C220 411 190 423 161 416L118 407Z" />
        <path d="M105 449L286 449L297 500C300 516 288 530 272 530L120 530C104 530 92 516 95 500Z" />
      </g>
      {/* dedos, palma, polegar e punho em branco, contornados pela cor do clube */}
      <g fill={light} stroke={color} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round">
        <path d="M105 325L78 160C74 133 87 113 109 110C131 107 146 124 149 150L168 320Z" />
        <path d="M150 310L132 115C129 88 143 68 166 65C190 63 205 82 207 109L220 300Z" />
        <path d="M200 300L196 90C195 61 211 40 235 38C259 37 276 56 276 85L274 300Z" />
        <path d="M250 305L261 120C263 93 278 75 301 77C324 79 338 98 336 125L326 315Z" />
        <path d="M100 275C135 250 174 245 207 253C239 261 264 277 288 296C311 315 319 340 310 365L286 432C278 456 259 471 234 475L151 475C123 475 104 458 98 431L78 337C73 311 82 288 100 275Z" />
        <path strokeWidth={detail} d="M151 329C172 316 197 317 216 328L239 344L211 391C195 407 171 409 152 398L131 385L140 350Z" />
        <path d="M286 335C310 315 330 287 350 254C365 230 390 232 402 250C414 268 408 290 395 310L332 401C317 423 294 431 273 417L254 404C270 384 281 360 286 335Z" />
        <path strokeWidth={detail} d="M108 464L284 464L288 503L104 503Z" />
        <path strokeWidth={detail} d="M149 150L164 160" />
        <path strokeWidth={detail} d="M207 109L220 122" />
        <path strokeWidth={detail} d="M276 123L289 135" />
      </g>
    </svg>
  );
}
