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
import type { ApplicationStatus, BrowsableJob } from "@/lib/types";

interface JobsExplorerProps {
  jobs: BrowsableJob[];
  hasResume: boolean;
  statusByJobId: Record<string, ApplicationStatus>;
}

type SortKey = "match" | "newest";

/** "Hyderabad, India" → "Hyderabad"; "Remote, India" → "Remote". */
function city(location: string): string {
  return location.split(",")[0].trim();
}

export function JobsExplorer({
  jobs,
  hasResume,
  statusByJobId,
}: JobsExplorerProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [location, setLocation] = React.useState("all");
  const [level, setLevel] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>(
    hasResume ? "match" : "newest"
  );

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
  }, [jobs, query, location, level, sort]);

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
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="muted">{filtered.length}</Badge>
        {filtered.length === 1 ? "job" : "jobs"}
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
            <p className="font-medium text-foreground">No jobs found</p>
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
