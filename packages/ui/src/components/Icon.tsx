import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

export type IconProps = LucideProps & {
  /** The lucide-react icon component to render. */
  icon: LucideIcon;
};

/**
 * Thin wrapper over lucide-react. Keeps a stable local import path so
 * consumers don't have to import lucide-react directly, and lets us swap
 * the set later without touching call sites.
 *
 *   import { Icon } from "@deliphone/ui";
 *   import { QrCode } from "lucide-react";
 *   <Icon icon={QrCode} size={20} />
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: IconComponent, size = 20, strokeWidth = 2, ...rest }, ref) => (
    <IconComponent ref={ref} size={size} strokeWidth={strokeWidth} {...rest} />
  ),
);
Icon.displayName = "Icon";

// Re-export lucide types for convenience.
export type { LucideIcon } from "lucide-react";
