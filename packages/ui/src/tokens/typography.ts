export const font = {
  sans: "'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

export type TypeToken = {
  name: string;
  size: number;
  line: number;
  weight: number;
  track: string;
  use: string;
};

export const type: readonly TypeToken[] = [
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
] as const;
