import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "./Icon.js";
import { colors } from "../tokens/index.js";

export type BadgeVariant =
  | "neutral"
  | "ink"
  | "accent"
  | "soft"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children?: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: LucideIcon;
}

type BadgeStyle = { bg: string; color: string; border?: string };

const VARIANTS: Record<BadgeVariant, BadgeStyle> = {
  neutral: { bg: colors.ink[100],         color: colors.ink[800] },
  ink:     { bg: colors.ink[900],         color: "#fff" },
  accent:  { bg: colors.accent.DEFAULT,   color: colors.accent.ink },
  soft:    { bg: colors.accent.soft,      color: colors.ink[900] },
  success: { bg: colors.success.bg,       color: colors.success.ink },
  warning: { bg: colors.warning.bg,       color: colors.warning.ink },
  danger:  { bg: colors.danger.bg,        color: colors.danger.ink },
  info:    { bg: colors.info.bg,          color: colors.info.ink },
  outline: { bg: "transparent",           color: colors.ink[700], border: `1px solid ${colors.ink[200]}` },
};

const SIZES: Record<BadgeSize, { h: number; fs: number; px: number; ico: number }> = {
  sm: { h: 22, fs: 11, px: 8,  ico: 11 },
  md: { h: 26, fs: 12, px: 10, ico: 13 },
  lg: { h: 32, fs: 13, px: 12, ico: 15 },
};

/** Делифон Badge — ported from docs/base.jsx. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = "neutral", size = "md", icon, style, ...rest }, ref) => {
    const v = VARIANTS[variant];
    const s = SIZES[size];
    return (
      <span
        ref={ref}
        style={{
          height: s.h,
          padding: `0 ${s.px}px`,
          borderRadius: 999,
          background: v.bg,
          color: v.color,
          border: v.border ?? "none",
          fontSize: s.fs,
          fontWeight: 600,
          letterSpacing: "0.02em",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
          ...style,
        }}
        {...rest}
      >
        {icon && <Icon icon={icon} size={s.ico} />}
        {children}
      </span>
    );
  },
);
Badge.displayName = "Badge";
