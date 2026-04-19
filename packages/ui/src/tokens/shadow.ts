export const shadow = {
  0: "none",
  1: "0 1px 2px rgba(15,15,14,0.04), 0 0 0 1px rgba(15,15,14,0.04)",
  2: "0 4px 12px rgba(15,15,14,0.06), 0 0 0 1px rgba(15,15,14,0.04)",
  3: "0 12px 32px rgba(15,15,14,0.10), 0 0 0 1px rgba(15,15,14,0.04)",
  4: "0 24px 56px rgba(15,15,14,0.18), 0 0 0 1px rgba(15,15,14,0.06)",
} as const;

export type Shadow = typeof shadow;
