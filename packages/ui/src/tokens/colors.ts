export const colors = {
  accent: {
    DEFAULT: "#D6FF3D",
    hover: "#C3EB2A",
    press: "#AED41A",
    ink: "#0F1410",
    soft: "#F1FFB5",
  },
  ink: {
    0: "#FFFFFF",
    50: "#F7F7F6",
    100: "#EFEFED",
    200: "#E3E3DF",
    300: "#CFCFC9",
    400: "#9C9C95",
    500: "#6B6B65",
    600: "#4A4A46",
    700: "#2E2E2C",
    800: "#1C1C1B",
    900: "#0F0F0E",
  },
  success: { DEFAULT: "#1E8E4F", bg: "#E6F5ED", ink: "#0B3C22" },
  warning: { DEFAULT: "#B8730A", bg: "#FBEFD9", ink: "#4A2E04" },
  danger: { DEFAULT: "#D2342A", bg: "#FBE6E4", ink: "#5A100B" },
  info: { DEFAULT: "#1E64D2", bg: "#E3EEFB", ink: "#0A2A5E" },
} as const;

export type Colors = typeof colors;
