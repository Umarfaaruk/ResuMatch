import Link from "next/link";
import { MessageSquareText, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InterviewPrep } from "@/components/InterviewPrep";
import { getActiveResume, getAllJobs } from "@/lib/queries";
import { getMatchedJobs } from "@/lib/matching";
import type { ParsedResume } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  const resume = await getActiveResume();

  if (!resume?.parsed_json) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warm/15 text-warm">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="font-medium text-foreground">Add a resume first</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Interview questions are personalized to your background. Upload or
              build a resume to get started.
            </p>
            <Button asChild className="mt-1">
              <Link href="/resume">Go to my resume</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsed = resume.parsed_json as ParsedResume;

  // Suggest roles from the user's top job matches.
  const jobs = await getAllJobs();
  const matches = getMatchedJobs(parsed, jobs, 6);
  const suggested = Array.from(
    new Set(matches.map((m) => m.role_title).filter(Boolean))
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <Header />
      <InterviewPrep
        defaultRole={parsed.role_title || "Software Engineer"}
        suggestedRoles={suggested}
      />
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
        <MessageSquareText className="h-6 w-6 text-primary" />
        Interview prep
      </h1>
      <p className="mt-1 text-muted-foreground">
        AI-generated questions tailored to your resume and target role, each
        with a quick tip on how to answer.
      </p>
    </header>
  );
}
