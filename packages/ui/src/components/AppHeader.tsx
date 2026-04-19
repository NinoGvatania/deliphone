import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { colors } from "../tokens/index.js";

export interface AppHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  left?: ReactNode;
  right?: ReactNode;
  /** Stick to top while the page scrolls. Default: true. */
  sticky?: boolean;
  /** Header height in px. Default 56. */
  height?: number;
  /** Horizontal padding in px. Default 16. */
  paddingInline?: number;
}

/**
 * Shared top bar for all three apps.
 * - white bg, ink-200 bottom border, sticky by default
 * - `left`/`right` slots; right items never push left out of view
 *   (right has `flexShrink: 0`, left truncates with `min-width: 0`)
 */
export const AppHeader = forwardRef<HTMLElement, AppHeaderProps>(
  ({ left, right, sticky = true, height = 56, paddingInline = 16, style, ...rest }, ref) => (
    <header
      ref={ref}
      style={{
        position: sticky ? "sticky" : "static",
        top: 0,
        zIndex: 10,
        height,
        background: colors.ink[0],
        borderBottom: `1px solid ${colors.ink[200]}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingInline,
        flexShrink: 0,
        gap: 12,
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          minWidth: 0,
        }}
      >
        {left}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {right}
      </div>
    </header>
  ),
);
AppHeader.displayName = "AppHeader";
