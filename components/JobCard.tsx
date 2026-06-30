"use client";

import * as React from "react";
import {
  MapPin,
  Building2,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Check,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchRing } from "@/components/MatchRing";
import { useToast } from "@/components/ui/toast";
import { upsertApplication } from "@/app/actions/applications";
import type { MatchedJob, ApplicationStatus } from "@/lib/types";

interface JobCardProps {
  job: MatchedJob;
  /** Current tracked status for this job, if any. */
  status?: ApplicationStatus | null;
}

export function JobCard({ job, status: initialStatus }: JobCardProps) {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<ApplicationStatus | null>(
    initialStatus ?? null
  );
  const [pending, startTransition] = React.useTransition();

  const saved = status !== null;

  function handleSave() {
    const nextSaved = !saved;
    startTransition(async () => {
      if (nextSaved) {
        const res = await upsertApplication(job.id, "saved");
        if (res.ok) {
          setStatus("saved");
          toast({ title: "Saved to tracker", variant: "success" });
        } else {
          toast({ title: "Couldn't save", description: res.error, variant: "error" });
        }
      } else {
        // We don't hard-delete from the card; just inform.
        toast({
          title: "Manage in Applications",
          description: "Remove it from the Applications board.",
        });
      }
    });
  }

  function handleApply() {
    if (job.source_url) {
      window.open(job.source_url, "_blank", "noopener,noreferrer");
    }
    startTransition(async () => {
      const res = await upsertApplication(job.id, "applied");
      if (res.ok) {
        setStatus("applied");
        toast({ title: "Marked as applied", variant: "success" });
      }
    });
  }

  return (
    <Card className="flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-foreground">
            {job.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {job.company}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
          </div>
        </div>
        <MatchRing score={job.matchScore} />
      </div>

      {job.matchedSkills.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Matched skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {job.matchedSkills.slice(0, 6).map((s) => (
              <Badge key={s} variant="success">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {job.missingSkills.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Skills to add
          </p>
          <div className="flex flex-wrap gap-1.5">
            {job.missingSkills.slice(0, 5).map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 pt-1">
        <Button
          onClick={handleApply}
          disabled={pending || !job.source_url}
          className="flex-1"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "applied" || status === "interview" ? (
            <Check className="h-4 w-4" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          {status === "applied" || status === "interview" ? "Applied" : "Apply"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={pending}
          variant={saved ? "secondary" : "outline"}
          size="icon"
          aria-label={saved ? "Saved" : "Save job"}
          title={saved ? "Saved" : "Save job"}
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4 text-primary" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>
      </div>
    </Card>
  );
}
