import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Target,
  KanbanSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResumeUploader } from "@/components/ResumeUploader";
import { JobCard } from "@/components/JobCard";
import { SkillGapCard } from "@/components/SkillGapCard";
import { getDashboardData } from "@/lib/queries";
import type { ParsedResume } from "@/lib/types";

export const dynamic = "force-dynamic";

const TRACKER_STATUSES = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "rejected", label: "Rejected" },
] as const;

export default async function DashboardPage() {
  const { resume, matches, skillGaps, applications, statusByJobId } =
    await getDashboardData();

  const parsed = resume?.parsed_json as ParsedResume | null;
  const counts = TRACKER_STATUSES.map((s) => ({
    ...s,
    count: applications.filter((a) => a.status === s.key).length,
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your resume status, best-fit jobs, and what to learn next.
        </p>
      </header>

      {/* Top row: resume status + skill gaps */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Resume status
            </CardTitle>
            <CardDescription>
              {resume
                ? "Your active resume is parsed and ATS-optimized."
                : "Upload a resume to unlock matches and an ATS rewrite."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resume && parsed ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Active &amp; ATS-ready
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Target role:{" "}
                    <span className="font-medium text-foreground">
                      {parsed.role_title}
                    </span>{" "}
                    · Level:{" "}
                    <span className="font-medium capitalize text-foreground">
                      {parsed.experience_level}
                    </span>
                  </span>
                </div>
                {parsed.skills.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Detected skills ({parsed.skills.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.skills.slice(0, 12).map((s) => (
                        <Badge key={s} variant="secondary" className="capitalize">
                          {s}
                        </Badge>
                      ))}
                      {parsed.skills.length > 12 && (
                        <Badge variant="muted">
                          +{parsed.skills.length - 12} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/resume">
                      View &amp; download ATS resume
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <div className="w-full sm:w-auto sm:min-w-[260px]">
                    <ResumeUploader compact />
                  </div>
                </div>
              </div>
            ) : (
              <ResumeUploader />
            )}
          </CardContent>
        </Card>

        <SkillGapCard gaps={skillGaps} />
      </div>

      {/* Mini application tracker */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KanbanSquare className="h-5 w-5 text-primary" />
              Application tracker
            </CardTitle>
            <CardDescription>
              {applications.length} job{applications.length === 1 ? "" : "s"} in
              your pipeline.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/applications">
              Open board
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {counts.map((c) => (
              <div key={c.key} className="rounded-lg border bg-secondary/40 p-4">
                <p className="text-2xl font-bold text-foreground">{c.count}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Matched jobs feed */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Matched jobs
          </h2>
          {matches.length > 0 && (
            <Badge variant="muted">{matches.length}</Badge>
          )}
        </div>

        {!resume ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Sparkles className="h-8 w-8 text-warm" />
              <p className="font-medium text-foreground">
                Upload your resume to see ranked matches
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                We score every job by skill overlap, role fit, and experience
                level — no guesswork.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                status={statusByJobId[job.id] ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
