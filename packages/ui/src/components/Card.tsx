import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { colors, motion, radius, shadow } from "../tokens/index.js";

export type CardVariant = "elevated" | "outlined" | "filled" | "ink" | "accent";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  variant?: CardVariant;
  padding?: number;
}

const VARIANTS: Record<CardVariant, CSSProperties> = {
  elevated: { background: "#fff",               border: `1px solid ${colors.ink[100]}`,  boxShadow: shadow[2] },
  outlined: { background: "#fff",               border: `1.5px solid ${colors.ink[200]}`, boxShadow: "none"  },
  filled:   { background: colors.ink[50],       border: "1px solid transparent",         boxShadow: "none"  },
  ink:      { background: colors.ink[900],      border: "none", color: "#fff",           boxShadow: shadow[2] },
  accent:   { background: colors.accent.DEFAULT, border: "none", color: colors.accent.ink, boxShadow: shadow[1] },
};

/** Делифон Card — ported from docs/base.jsx. */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = "elevated", padding = 20, style, onClick, ...rest }, ref) => {
    const v = VARIANTS[variant];
    return (
      <div
        ref={ref}
        onClick={onClick}
        style={{
          ...v,
          borderRadius: radius.xl,
          padding,
          cursor: onClick ? "pointer" : "default",
          transition: `transform ${motion.fast}`,
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";
