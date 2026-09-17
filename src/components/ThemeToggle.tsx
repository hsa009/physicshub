import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const isLight = mode === "light";

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      className="flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0"
    >
      <div className="toggle-track">
        <div className="toggle-thumb">{isLight ? "☀" : "☾"}</div>
      </div>
      <span className="toggle-label">{isLight ? "Light" : "Dark"}</span>
    </button>
  );
}
