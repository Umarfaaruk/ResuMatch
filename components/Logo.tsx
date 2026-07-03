import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Jobly brand wordmark: bold navy "Jobly" with a graduation cap tilted over
 * the J. Scales with the surrounding font size — set text-* on className.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-block font-bold tracking-tight text-primary",
        className
      )}
      aria-label="Jobly"
    >
      <GraduationCap
        aria-hidden
        className="absolute -left-[0.32em] -top-[0.52em] h-[0.85em] w-[0.85em] -rotate-[18deg]"
        strokeWidth={2.4}
      />
      Jobly
    </span>
  );
}
