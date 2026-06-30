import Link from "next/link";
import { FileText, Download, Briefcase, GraduationCap, FileSearch } from "lucide-react";
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
import { AtsResumePreview } from "@/components/AtsResumePreview";
import { getActiveResume } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { ParsedResume } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const resume = await getActiveResume();

  if (!resume || !resume.parsed_json) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardContent className="py-8">
            <ResumeUploader />
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsed = resume.parsed_json as ParsedResume;

  // A short-lived signed URL to view the originally uploaded file.
  let originalUrl: string | null = null;
  if (resume.original_file_path) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("resumes")
      .createSignedUrl(resume.original_file_path, 60 * 10);
    originalUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Target role:{" "}
          <span className="font-medium text-foreground">
            {parsed.role_title}
          </span>{" "}
          · Level{" "}
          <span className="font-medium capitalize text-foreground">
            {parsed.experience_level}
          </span>
        </p>
        <div className="sm:w-72">
          <ResumeUploader compact />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT — extracted from original */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-5 w-5 text-muted-foreground" />
              What we extracted
            </CardTitle>
            <CardDescription>
              The structured data parsed from your original upload.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Skills
              </h3>
              {parsed.skills.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {parsed.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="capitalize">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None detected.</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                Experience
              </h3>
              {parsed.experience.length ? (
                <ul className="space-y-3">
                  {parsed.experience.map((e, i) => (
                    <li key={i} className="rounded-lg border p-3">
                      <p className="text-sm font-medium text-foreground">
                        {e.title || "Role"}
                        {e.company ? ` · ${e.company}` : ""}
                      </p>
                      {e.duration && (
                        <p className="text-xs text-muted-foreground">
                          {e.duration}
                        </p>
                      )}
                      {e.highlights.length > 0 && (
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                          {e.highlights.map((h, j) => (
                            <li key={j}>{h}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No experience entries detected.
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
                Education
              </h3>
              {parsed.education.length ? (
                <ul className="space-y-2">
                  {parsed.education.map((e, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium text-foreground">
                        {e.degree || "Qualification"}
                      </span>
                      {e.institution ? ` — ${e.institution}` : ""}
                      {e.year ? (
                        <span className="text-muted-foreground"> ({e.year})</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No education entries detected.
                </p>
              )}
            </section>

            {originalUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={originalUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                  View original upload
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* RIGHT — ATS-optimized */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-warm" />
              ATS-optimized resume
            </CardTitle>
            <CardDescription>
              Clean, single-column, machine-readable. Download as PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {resume.ats_text ? (
              <AtsResumePreview
                atsText={resume.ats_text}
                fileLabel={parsed.role_title || "resume"}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No ATS text was generated. Try re-uploading your resume.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          My Resume
        </h1>
        <p className="mt-1 text-muted-foreground">
          Compare your original against the ATS-safe rewrite.
        </p>
      </div>
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </header>
  );
}
