import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "./Icon.js";
import { colors, font, motion, radius } from "../tokens/index.js";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "onChange"> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  rightIcon?: LucideIcon;
  prefix?: ReactNode;
  suffix?: ReactNode;
  onChange?: (value: string) => void;
}

/** Делифон Input — ported from docs/base.jsx. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      hint,
      error,
      icon,
      rightIcon,
      prefix,
      suffix,
      disabled,
      value,
      onChange,
      type = "text",
      ...rest
    },
    ref,
  ) => {
    const reactId = useId();
    const inputId = id ?? reactId;
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? colors.danger.DEFAULT
      : focused
        ? colors.ink[900]
        : colors.ink[200];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: colors.ink[700],
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </label>
        )}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            height: 48,
            background: disabled ? colors.ink[50] : "#fff",
            border: `1.5px solid ${borderColor}`,
            borderRadius: radius.md,
            padding: "0 14px",
            gap: 10,
            transition: `border-color ${motion.fast}`,
            boxShadow: focused && !error ? "0 0 0 4px rgba(15,15,14,0.06)" : "none",
          }}
        >
          {icon && <Icon icon={icon} size={18} color={colors.ink[500]} />}
          {prefix && <span style={{ fontSize: 15, color: colors.ink[500] }}>{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            type={type}
            value={value ?? ""}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 15,
              fontFamily: font.sans,
              color: colors.ink[900],
              minWidth: 0,
            }}
            {...rest}
          />
          {suffix && (
            <span style={{ fontSize: 13, fontWeight: 500, color: colors.ink[500] }}>{suffix}</span>
          )}
          {rightIcon && <Icon icon={rightIcon} size={18} color={colors.ink[500]} />}
        </div>
        {(error || hint) && (
          <div
            style={{
              fontSize: 12,
              color: error ? colors.danger.DEFAULT : colors.ink[500],
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {error && <Icon icon={AlertCircle} size={13} />}
            {error || hint}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
