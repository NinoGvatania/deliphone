import type { Config } from "tailwindcss";
import delifonPreset from "@deliphone/ui/tailwind.preset";

export default {
  presets: [delifonPreset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config;
