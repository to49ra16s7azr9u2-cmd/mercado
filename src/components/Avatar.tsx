const PALETTE = [
  "#06c755", "#00b8a9", "#4f8cff", "#8b5cf6", "#ff6b9d", "#ff9f43",
  "#f368e0", "#10ac84", "#5f27cd", "#ee5253", "#0abde3", "#576574",
];

export function Avatar({
  seed,
  name,
  size = 40,
  ring = false,
}: {
  seed: string;
  name: string;
  size?: number;
  ring?: boolean;
}) {
  const index = Number.parseInt(seed, 10);
  const color = PALETTE[(Number.isFinite(index) ? index : name.length) % PALETTE.length];
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${ring ? "ring-2 ring-white" : ""}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}bb)`,
        fontSize: size * 0.42,
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
