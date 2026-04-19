/**
 * Делифон Tailwind preset — consumed by apps/client and apps/partner.
 *
 * Usage (in apps/<name>/tailwind.config.ts):
 *   import delifonPreset from "@deliphone/ui/tailwind.preset";
 *   export default {
 *     presets: [delifonPreset],
 *     content: ["./index.html", "./src/**\/*.{ts,tsx}"],
 *   };
 *
 * The preset ships only theme/plugins — consumers still declare their own
 * `content` globs.
 */

import type { Config } from "tailwindcss";
import {
  bp,
  colors,
  font,
  motion,
  radius,
  shadow,
  space,
  type,
} from "./src/tokens/index.js";

const px = (n: number) => `${n}px`;

const fontSize = Object.fromEntries(
  type.map((t) => [
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
) as Record<string, [string, { lineHeight: string; fontWeight: string; letterSpacing: string }]>;

const spacing = Object.fromEntries(space.map((v) => [String(v), px(v)]));

const borderRadius = Object.fromEntries(
  Object.entries(radius).map(([k, v]) => [k, px(v)]),
);

const boxShadow = {
  "elev-0": shadow[0],
  "elev-1": shadow[1],
  "elev-2": shadow[2],
  "elev-3": shadow[3],
  "elev-4": shadow[4],
};

const screens = Object.fromEntries(
  Object.entries(bp).map(([k, v]) => [k, px(v)]),
);

// Parse "120ms cubic-bezier(...)" tokens into Tailwind-friendly duration.
const motionDurations = {
  fast: motion.fast.split(" ")[0] ?? "120ms",
  base: motion.base.split(" ")[0] ?? "200ms",
  slow: motion.slow.split(" ")[0] ?? "320ms",
  spring: motion.spring.split(" ")[0] ?? "420ms",
};

const preset = {
  content: [],
  theme: {
    screens,
    extend: {
      colors: {
        accent: colors.accent,
        ink: colors.ink,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        info: colors.info,
      },
      fontFamily: {
        sans: [font.sans],
        mono: [font.mono],
      },
      fontSize,
      spacing,
      borderRadius,
      boxShadow,
      transitionDuration: motionDurations,
      transitionTimingFunction: {
        "delifon": "cubic-bezier(0.2, 0.8, 0.2, 1)",
        "delifon-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      animation: {
        "delifon-spin": "delifon-spin 0.8s linear infinite",
        "delifon-skeleton": "delifon-skeleton 1.4s ease-in-out infinite",
        "delifon-scan": "delifon-scan 2s ease-in-out infinite",
        "delifon-slideup": "delifon-slideup 420ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "delifon-popin": "delifon-popin 420ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "delifon-pulse": "delifon-pulse 1.6s ease-in-out infinite",
      },
      keyframes: {
        "delifon-spin": { to: { transform: "rotate(360deg)" } },
        "delifon-skeleton": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "delifon-scan": {
          "0%":   { top: "10%", opacity: "0.2" },
          "50%":  { top: "85%", opacity: "1" },
          "100%": { top: "10%", opacity: "0.2" },
        },
        "delifon-slideup": {
          from: { transform: "translateY(100%)" },
          to:   { transform: "translateY(0)" },
        },
        "delifon-popin": {
          from: { transform: "scale(0.94)", opacity: "0" },
          to:   { transform: "scale(1)", opacity: "1" },
        },
        "delifon-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
} satisfies Partial<Config>;

export default preset;
