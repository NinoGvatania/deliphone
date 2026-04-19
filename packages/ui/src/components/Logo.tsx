import { forwardRef, type HTMLAttributes } from "react";
import { Smartphone } from "lucide-react";
import { colors, font } from "../tokens/index.js";

export type LogoVariant = "full" | "wordmark";
export type LogoSize = "sm" | "md" | "lg";
export type LogoTone = "dark" | "light";

export interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  /** "full" shows the lime icon pill + wordmark; "wordmark" shows text only. */
  variant?: LogoVariant;
  size?: LogoSize;
  /** "dark" = wordmark in ink-900 (for light backgrounds). "light" = white on dark. */
  tone?: LogoTone;
}

const SIZES: Record<
  LogoSize,
  { icon: number; iconBox: number; text: number; radius: number; gap: number }
> = {
  sm: { icon: 14, iconBox: 24, text: 14, radius: 8,  gap: 6  },
  md: { icon: 18, iconBox: 32, text: 17, radius: 10, gap: 8  },
  lg: { icon: 22, iconBox: 40, text: 22, radius: 12, gap: 10 },
};

/**
 * Делифон logo. Composed from a lime accent icon tile + "Делифон"
 * wordmark (Onest 700, tracking -0.01em) — mirrors the admin sidebar
 * mark from docs/compositions.jsx. Use `tone="light"` on dark surfaces.
 */
export const Logo = forwardRef<HTMLSpanElement, LogoProps>(
  ({ variant = "full", size = "md", tone = "dark", style, ...rest }, ref) => {
    const s = SIZES[size];
    const textColor = tone === "dark" ? colors.ink[900] : colors.ink[0];
    return (
      <span
        ref={ref}
        aria-label="Делифон"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: s.gap,
          ...style,
        }}
        {...rest}
      >
        {variant === "full" && (
          <span
            aria-hidden
            style={{
              width: s.iconBox,
              height: s.iconBox,
              borderRadius: s.radius,
              background: colors.accent.DEFAULT,
              color: colors.accent.ink,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Smartphone size={s.icon} strokeWidth={2.2} />
          </span>
        )}
        <span
          style={{
            fontSize: s.text,
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: textColor,
            fontFamily: font.sans,
            whiteSpace: "nowrap",
          }}
        >
          Делифон
        </span>
      </span>
    );
  },
);
Logo.displayName = "Logo";
