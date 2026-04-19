/**
 * Делифон Design System — v0.1
 *
 * Single source of truth for colors, typography, spacing, radii, shadows,
 * breakpoints, motion. Ported from the original `tokens.jsx` delivered by
 * Claude Design. Tailwind configs (apps/client, apps/partner) and Ant Design
 * theme (apps/admin) pull from this file.
 */

export const DelifonTokens = {
  brand: {
    name: "Делифон",
    tagline: "Смартфон в аренду. Сеть точек по городу.",
    description: "Сервис аренды смартфонов для курьеров.",
  },

  color: {
    accent: {
      DEFAULT: "#D6FF3D",
      hover: "#C3EB2A",
      press: "#AED41A",
      ink: "#0F1410",
      soft: "#F1FFB5",
    },
    ink: {
      0: "#FFFFFF",
      50: "#F7F7F6",
      100: "#EFEFED",
      200: "#E3E3DF",
      300: "#CFCFC9",
      400: "#9C9C95",
      500: "#6B6B65",
      600: "#4A4A46",
      700: "#2E2E2C",
      800: "#1C1C1B",
      900: "#0F0F0E",
    },
    success: { DEFAULT: "#1E8E4F", bg: "#E6F5ED", ink: "#0B3C22" },
    warning: { DEFAULT: "#B8730A", bg: "#FBEFD9", ink: "#4A2E04" },
    danger: { DEFAULT: "#D2342A", bg: "#FBE6E4", ink: "#5A100B" },
    info: { DEFAULT: "#1E64D2", bg: "#E3EEFB", ink: "#0A2A5E" },
  },

  font: {
    sans: "'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },

  type: [
    { name: "display-xl", size: 48, line: 52, weight: 700, track: "-0.03em",
      use: "Hero в маркетинге, бейджи сумм" },
    { name: "display",    size: 36, line: 40, weight: 700, track: "-0.03em",
      use: "Крупные суммы в аренде, итоги" },
    { name: "h1",         size: 28, line: 32, weight: 700, track: "-0.02em",
      use: "Заголовок экрана" },
    { name: "h2",         size: 22, line: 28, weight: 600, track: "-0.01em",
      use: "Секция, карточка" },
    { name: "h3",         size: 18, line: 24, weight: 600, track: "-0.005em",
      use: "Заголовок блока" },
    { name: "body-lg",    size: 17, line: 24, weight: 400, track: "0",
      use: "Главный текст на мобиле" },
    { name: "body",       size: 15, line: 22, weight: 400, track: "0",
      use: "Стандартный текст" },
    { name: "body-sm",    size: 13, line: 18, weight: 500, track: "0",
      use: "Лейблы, мета" },
    { name: "caption",    size: 12, line: 16, weight: 500, track: "0.01em",
      use: "Подписи, сноски" },
    { name: "mono",       size: 13, line: 18, weight: 500, track: "0",
      use: "Цифры, QR, ID" },
  ],

  space: [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],

  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    "2xl": 36,
    full: 999,
  },

  shadow: {
    0: "none",
    1: "0 1px 2px rgba(15,15,14,0.04), 0 0 0 1px rgba(15,15,14,0.04)",
    2: "0 4px 12px rgba(15,15,14,0.06), 0 0 0 1px rgba(15,15,14,0.04)",
    3: "0 12px 32px rgba(15,15,14,0.10), 0 0 0 1px rgba(15,15,14,0.04)",
    4: "0 24px 56px rgba(15,15,14,0.18), 0 0 0 1px rgba(15,15,14,0.06)",
  },

  bp: { sm: 380, md: 768, lg: 1024, xl: 1280, "2xl": 1536 },

  motion: {
    fast: "120ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    base: "200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    slow: "320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    spring: "420ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;

export type DelifonTokensType = typeof DelifonTokens;
