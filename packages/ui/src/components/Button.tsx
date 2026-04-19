import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "./Icon.js";
import { Spinner } from "./Spinner.js";
import { colors, font, motion, shadow } from "../tokens/index.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

const SIZES: Record<ButtonSize, { h: number; px: number; fs: number; gap: number; icon: number }> = {
  sm: { h: 36, px: 14, fs: 13, gap: 6, icon: 16 },
  md: { h: 44, px: 18, fs: 15, gap: 8, icon: 18 },
  lg: { h: 56, px: 24, fs: 17, gap: 10, icon: 20 },
};

type VariantStyles = {
  bg: string;
  color: string;
  border: string;
  shadow: string;
};

const VARIANTS: Record<ButtonVariant, VariantStyles> = {
  primary:     { bg: colors.accent.DEFAULT, color: colors.accent.ink, border: "transparent", shadow: shadow[1] },
  secondary:   { bg: colors.ink[900],       color: "#fff",            border: "transparent", shadow: shadow[1] },
  ghost:       { bg: "transparent",         color: colors.ink[900],   border: colors.ink[200], shadow: "none" },
  destructive: { bg: colors.danger.DEFAULT, color: "#fff",            border: "transparent", shadow: shadow[1] },
  link:        { bg: "transparent",         color: colors.ink[900],   border: "transparent", shadow: "none" },
};

/** Делифон Button — ported from docs/base.jsx. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      icon,
      iconRight,
      loading = false,
      fullWidth = false,
      disabled,
      style,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    const s = SIZES[size];
    const v = VARIANTS[variant];
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        style={{
          height: s.h,
          padding: variant === "link" ? 0 : `0 ${s.px}px`,
          fontSize: s.fs,
          fontWeight: 600,
          letterSpacing: "-0.005em",
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: s.gap,
          background: v.bg,
          color: v.color,
          border: `1.5px solid ${v.border === "transparent" ? "transparent" : v.border}`,
          borderRadius: 999,
          boxShadow: v.shadow,
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          textDecoration: variant === "link" ? "underline" : "none",
          textUnderlineOffset: 3,
          transition: `all ${motion.fast}`,
          width: fullWidth ? "100%" : "auto",
          fontFamily: font.sans,
          ...style,
        }}
        {...rest}
      >
        {loading && <Spinner size={s.icon} color={v.color} />}
        {!loading && icon && <Icon icon={icon} size={s.icon} />}
        {children}
        {!loading && iconRight && <Icon icon={iconRight} size={s.icon} />}
      </button>
    );
  },
);
Button.displayName = "Button";
