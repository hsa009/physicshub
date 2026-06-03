/**
 * Thin gold ring spinner used across the app for AI-in-flight states.
 */
export default function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-2 border-border-mid border-t-gold"
      style={{ width: size, height: size }}
    />
  );
}
