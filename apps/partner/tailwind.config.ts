import type { Config } from "tailwindcss";
import { DelifonTokens } from "@deliphone/shared-types/tokens";

const px = (n: number) => `${n}px`;

const fontSize = Object.fromEntries(
  DelifonTokens.type.map((t) => [
    t.name,
    [
      px(t.size),
      {
        lineHeight: px(t.line),
        fontWeight: String(t.weight),
        letterSpacing: t.track,
      },
    ],
  ]),
);

const spacing = Object.fromEntries(
  DelifonTokens.space.map((v) => [String(v), px(v)]),
);

const borderRadius = Object.fromEntries(
  Object.entries(DelifonTokens.radius).map(([k, v]) => [k, px(v)]),
);

const boxShadow = {
  "elev-0": DelifonTokens.shadow[0],
  "elev-1": DelifonTokens.shadow[1],
  "elev-2": DelifonTokens.shadow[2],
  "elev-3": DelifonTokens.shadow[3],
  "elev-4": DelifonTokens.shadow[4],
};

const screens = Object.fromEntries(
  Object.entries(DelifonTokens.bp).map(([k, v]) => [k, px(v)]),
);

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens,
    extend: {
      colors: {
        accent: DelifonTokens.color.accent,
        ink: DelifonTokens.color.ink,
        success: DelifonTokens.color.success,
        warning: DelifonTokens.color.warning,
        danger: DelifonTokens.color.danger,
        info: DelifonTokens.color.info,
      },
      fontFamily: {
        sans: [DelifonTokens.font.sans],
        mono: [DelifonTokens.font.mono],
      },
      fontSize: fontSize as Record<string, [string, Record<string, string>]>,
      spacing,
      borderRadius,
      boxShadow,
    },
  },
  plugins: [],
} satisfies Config;
