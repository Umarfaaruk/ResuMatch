import { GraduationCap, ExternalLink, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SkillGap } from "@/lib/types";

interface SkillGapCardProps {
  gaps: SkillGap[];
}

export function SkillGapCard({ gaps }: SkillGapCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-warm" />
          Skills to learn next
        </CardTitle>
        <CardDescription>
          The most common skills missing across your top matches — each with a
          free resource.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Sparkles className="h-4 w-4" />
            You already cover the key skills in your top matches. Nice work!
          </div>
        ) : (
          <ul className="space-y-3">
            {gaps.map((gap) => (
              <li key={gap.skill}>
                <a
                  href={gap.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-warm/50 hover:bg-warm/5"
                >
                  <div className="min-w-0">
                    <p className="font-medium capitalize text-foreground">
                      {gap.skill}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {gap.resourceName}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-warm" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
