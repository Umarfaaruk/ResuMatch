"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, SearchX, RadioTower } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/JobCard";
import { useToast } from "@/components/ui/toast";
import { isInternship } from "@/lib/matching";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, BrowsableJob } from "@/lib/types";

interface JobsExplorerProps {
  jobs: BrowsableJob[];
  hasResume: boolean;
  statusByJobId: Record<string, ApplicationStatus>;
  /** "internships" narrows to intern/trainee listings; default shows the rest. */
  mode?: "jobs" | "internships";
}

type SortKey = "match" | "newest";

/** "Hyderabad, India" → "Hyderabad"; "Remote, India" → "Remote". */
function city(location: string): string {
  return location.split(",")[0].trim();
}

export function JobsExplorer({
  jobs: allJobs,
  hasResume,
  statusByJobId,
  mode = "jobs",
}: JobsExplorerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [location, setLocation] = React.useState("all");
  const [level, setLevel] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>(
    hasResume ? "match" : "newest"
  );

  const [walkInOnly, setWalkInOnly] = React.useState(false);

  const jobs = React.useMemo(
    () =>
      allJobs.filter((j) =>
        mode === "internships" ? isInternship(j) : !isInternship(j)
      ),
    [allJobs, mode]
  );
  const noun = mode === "internships" ? "internship" : "job";

  // "What's new since I last looked?" — compare against the newest
  // posted_date the user saw on their previous visit (per mode).
  React.useEffect(() => {
    if (jobs.length === 0) return;
    const key = `jobly-last-seen-${mode}`;
    const lastSeen = localStorage.getItem(key);
    const newest = jobs
      .map((j) => j.posted_date)
      .sort()
      .at(-1)!;
    if (lastSeen) {
      const fresh = jobs.filter((j) => j.posted_date > lastSeen).length;
      if (fresh > 0) {
        toast({
          title: `${fresh} new ${noun}${fresh === 1 ? "" : "s"} since your last visit`,
          variant: "success",
        });
      }
    }
    localStorage.setItem(key, newest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the board fresh: pull the latest listings from the live job feeds
  // once a minute while the page is open (the server rate-limits providers).
  React.useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        const res = await fetch("/api/jobs/sync", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data?.changed) router.refresh();
      } catch {
        /* offline or provider hiccup — try again next tick */
      }
    }
    sync();
    const id = setInterval(sync, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  const locations = React.useMemo(
    () => Array.from(new Set(jobs.map((j) => city(j.location)))).sort(),
    [jobs]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = jobs.filter((job) => {
      if (location !== "all" && city(job.location) !== location) return false;
      if (level !== "all" && job.experience_level !== level) return false;
      if (
        walkInOnly &&
        !/walk[\s-]?in/i.test(`${job.title} ${job.description}`)
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        job.title,
        job.company,
        job.location,
        job.role_title,
        job.description,
        ...job.required_skills,
      ]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });

    return list.sort((a, b) =>
      sort === "match"
        ? (b.matchScore ?? 0) - (a.matchScore ?? 0)
        : +new Date(b.posted_date) - +new Date(a.posted_date)
    );
  }, [jobs, query, location, level, sort, walkInOnly]);

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, company, or skill (e.g. React, Data Analyst)…"
            className="pl-9"
            aria-label="Search jobs"
          />
        </div>
        <div className="flex gap-2">
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-36" aria-label="Filter by location">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-32" aria-label="Filter by experience level">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="fresher">Fresher</SelectItem>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-32" aria-label="Sort jobs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hasResume && <SelectItem value="match">Best match</SelectItem>}
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
          {mode === "jobs" && (
            <button
              onClick={() => setWalkInOnly((v) => !v)}
              aria-pressed={walkInOnly}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                walkInOnly
                  ? "border-warm bg-warm/10 text-warm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Walk-in
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="muted">{filtered.length}</Badge>
        {filtered.length === 1 ? noun : `${noun}s`}
        {query.trim() && <span>matching &ldquo;{query.trim()}&rdquo;</span>}
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs">
          <RadioTower className="h-3.5 w-3.5 text-success" />
          Live feed — refreshes every minute
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-foreground">No {noun}s found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Try a broader search term or clear the location and level filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              status={statusByJobId[job.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
