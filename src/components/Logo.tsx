interface LogoProps {
  size?: "sm" | "md";
}

export default function Logo({ size = "md" }: LogoProps) {
  const cls = size === "sm" ? "text-[1.1rem]" : "text-[1.5rem]";
  return (
    <span
      className={`font-serif font-normal uppercase text-text-primary ${cls}`}
      style={{ letterSpacing: "0.15em" }}
    >
      Physics <em className="font-light italic text-gold">Hub</em>
    </span>
  );
}
