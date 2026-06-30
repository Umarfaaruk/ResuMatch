import Link from "next/link";
import { ArrowLeft, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumeBuilderForm } from "@/components/ResumeBuilderForm";

export const dynamic = "force-dynamic";

export default function BuildResumePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/resume">
            <ArrowLeft className="h-4 w-4" />
            Back to resume
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <PencilRuler className="h-6 w-6 text-warm" />
          Build a resume
        </h1>
        <p className="mt-1 text-muted-foreground">
          Fill in what you can — AI turns it into clean ATS-friendly and
          humanized resumes you can download as PDF. This becomes your active
          resume for job matching.
        </p>
      </div>
      <ResumeBuilderForm />
    </div>
  );
}
