export interface SpinnerProps {
  size?: number;
  color?: string;
}

/** Делифон Spinner — from docs/base.jsx. Uses the delifon-spin keyframe. */
export function Spinner({ size = 16, color = "currentColor" }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: "delifon-spin 0.8s linear infinite" }}
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
