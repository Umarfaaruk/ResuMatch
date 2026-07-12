import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";
import { JobsExplorer } from "@/components/JobsExplorer";
import { getBrowseJobsData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InternshipsPage() {
  const { jobs, hasResume, statusByJobId } = await getBrowseJobsData();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <GraduationCap className="h-6 w-6 text-primary" />
          Internships
        </h1>
        <p className="mt-1 text-muted-foreground">
          Intern and trainee openings — the fastest door into your first role.
          Save or apply in one click.
        </p>
      </header>

      {!hasResume && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warm/40 bg-warm/5 px-4 py-3 text-sm">
          <Sparkles className="h-4 w-4 shrink-0 text-warm" />
          <span className="text-foreground">
            Add your resume to see a match score on every internship.
          </span>
          <Link
            href="/resume"
            className="font-semibold text-primary hover:underline"
          >
            Upload or build one →
          </Link>
        </div>
      )}

      <JobsExplorer
        jobs={jobs}
        hasResume={hasResume}
        statusByJobId={statusByJobId}
        mode="internships"
      />
    </div>
  );
}
