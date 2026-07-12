import { Gauge, Lightbulb } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MatchRing } from "@/components/MatchRing";
import { scoreResume } from "@/lib/ats-score";
import { cn } from "@/lib/utils";
import type { ParsedResume } from "@/lib/types";

/** ATS-readiness grade for the active resume, with concrete fixes. */
export function AtsScoreCard({ parsed }: { parsed: ParsedResume }) {
  const { total, checks, suggestions } = scoreResume(parsed);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-5 w-5 text-primary" />
          ATS score
        </CardTitle>
        <CardDescription>
          How well your resume will survive automated screening.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <MatchRing score={total} size={72} />
          <div className="flex-1 space-y-1.5">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2">
                <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">
                  {c.label}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      c.score / c.max >= 0.75
                        ? "bg-success"
                        : c.score / c.max >= 0.4
                          ? "bg-warm"
                          : "bg-destructive/70"
                    )}
                    style={{ width: `${(c.score / c.max) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-medium text-foreground">
                  {c.score}/{c.max}
                </span>
              </div>
            ))}
          </div>
        </div>

        {suggestions.length > 0 && (
          <ul className="space-y-1.5 border-t pt-3">
            {suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm" />
                {s}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
