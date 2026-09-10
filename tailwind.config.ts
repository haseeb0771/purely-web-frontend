import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F8FAFC",
        accent: "#2FB9BF",
        accentsoft: "#E6F7F8",
        textlight: "#0F172A",
        textmuted: "#475569",
        borderline: "#E2E8F0",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;