/**
 * AskToggleButton — floating ✦ button that opens the AskDrawer (M5.4).
 *
 * Fixed bottom-right on desktop, fixed bottom-center on mobile. Pulses
 * gently so students notice it. When the drawer is open, the button
 * stays but rotates 45° (becomes ✕).
 */

interface AskToggleButtonProps {
  open: boolean;
  onClick: () => void;
  hasMessages: boolean;
}

export default function AskToggleButton({
  open,
  onClick,
  hasMessages,
}: AskToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close Ask AI" : "Ask AI about this lesson"}
      aria-expanded={open}
      aria-controls="ask-drawer"
      className={`ask-toggle ${open ? "ask-toggle--open" : ""} ${
        hasMessages && !open ? "ask-toggle--has-messages" : ""
      }`}
    >
      <span aria-hidden className="text-[1rem] leading-none">
        {open ? "✕" : "✦"}
      </span>
      <span className="hidden md:inline">
        {open ? "Close" : "Ask AI"}
      </span>
    </button>
  );
}
