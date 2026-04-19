/**
 * Делифон design tokens — single source of truth for all three apps.
 *
 * Ported one-to-one from `docs/tokens.jsx`. Don't edit token values here
 * without updating the source of truth in the design bundle first.
 */

import { colors } from "./colors.js";
import { font, type } from "./typography.js";
import { space } from "./spacing.js";
import { radius } from "./radius.js";
import { shadow } from "./shadow.js";
import { motion } from "./motion.js";
import { bp } from "./breakpoints.js";

export { colors } from "./colors.js";
export { font, type } from "./typography.js";
export { space } from "./spacing.js";
export { radius } from "./radius.js";
export { shadow } from "./shadow.js";
export { motion } from "./motion.js";
export { bp } from "./breakpoints.js";

export const brand = {
  name: "Делифон",
  tagline: "Смартфон в аренду. Сеть точек по городу.",
  description: "Сервис аренды смартфонов для курьеров.",
} as const;

export const tokens = {
  brand,
  color: colors,
  font,
  type,
  space,
  radius,
  shadow,
  bp,
  motion,
} as const;

export type Tokens = typeof tokens;

/** Back-compat alias — matches the name used in the original tokens.jsx. */
export const DelifonTokens = tokens;
