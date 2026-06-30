import { cn } from "@/lib/utils";

interface MatchRingProps {
  score: number; // 0–100
  size?: number;
  className?: string;
}

/** Circular SVG match-percentage indicator. Color shifts with strength. */
export function MatchRing({ score, size = 56, className }: MatchRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 70
      ? "hsl(var(--success))"
      : clamped >= 40
        ? "hsl(var(--warm))"
        : "hsl(var(--muted-foreground))";

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color }}
      >
        {clamped}%
      </span>
    </div>
  );
}
