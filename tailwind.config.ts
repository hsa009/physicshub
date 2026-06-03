import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-card": "var(--bg-card)",
        "bg-subtle": "var(--bg-subtle)",
        border: "var(--border)",
        "border-mid": "var(--border-mid)",
        gold: "var(--gold)",
        "gold-light": "var(--gold-light)",
        "gold-dim": "var(--gold-dim)",
        "text-primary": "var(--text-primary)",
        "text-body": "var(--text-body)",
        "text-label": "var(--text-label)",
        "nav-bg": "var(--nav-bg)",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "serif"],
        sans: ["Outfit", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.5em",
        nav: "0.35em",
        btn: "0.4em",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
