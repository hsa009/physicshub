import { useEffect, useState, createContext, useContext } from "react";

type Mode = "dark" | "light";

interface ThemeContextValue {
  mode: Mode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "physicshub-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem(STORAGE_KEY) as Mode | null;
    return stored === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
