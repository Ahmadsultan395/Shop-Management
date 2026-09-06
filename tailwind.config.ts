import type { Config } from "tailwindcss";

// Design tokens — "shop register" identity, not a generic SaaS dashboard.
// paper: page background, ink: primary text/sidebar, ledger: primary action
// accent colors map directly to salary/purchase status (pending/partial/paid)
// so color always encodes real meaning in this app, never decoration.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F3F1EA",
        "paper-line": "#DAD4C4",
        ink: {
          DEFAULT: "#211F1C",
          soft: "#5B564C",
        },
        ledger: {
          DEFAULT: "#2B4C5C",
          dark: "#1D3540",
          light: "#3E6577",
        },
        stamp: {
          red: "#A8422F",
          green: "#3F6E4D",
          amber: "#B8863B",
        },
      },
      fontFamily: {
        serif: ["Source Serif 4", "Georgia", "serif"],
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        md: "6px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(33,31,28,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
