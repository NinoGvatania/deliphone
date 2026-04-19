// «Пилюля» — крупные радиусы
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  "2xl": 36,
  full: 999,
} as const;

export type Radius = typeof radius;
