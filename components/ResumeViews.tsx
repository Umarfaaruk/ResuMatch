"use client";

import * as React from "react";
import Link from "next/link";
import { Download, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ResumeTemplate } from "@/components/ResumeTemplate";
import { AtsResumePreview } from "@/components/AtsResumePreview";
import type { ResumeVersion } from "@/components/AtsResumePreview";
import { downloadTemplatePdf } from "@/lib/pdf-template";
import { cn } from "@/lib/utils";
import type { ParsedResume } from "@/lib/types";

interface ResumeViewsProps {
  parsed: ParsedResume;
  atsText: string;
  fileLabel: string;
}

/**
 * The "Optimized resume" card body: a formatted professional template
 * (default) and a plain ATS text version with in-place editing.
 */
export function ResumeViews({ parsed, atsText, fileLabel }: ResumeViewsProps) {
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"template" | "ats">("template");
  const [downloading, setDownloading] = React.useState(false);

  const atsVersion: ResumeVersion[] = [
    { id: "ats", key: "ATS", label: "ATS plain text", text: atsText, serif: true },
  ];

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadTemplatePdf(
        parsed,
        `${parsed.name || fileLabel}-resume`.replace(/\s+/g, "_")
      );
      toast({ title: "Downloaded resume PDF", variant: "success" });
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border bg-secondary/60 p-0.5">
          {(
            [
              { key: "template", label: "Professional" },
              { key: "ats", label: "ATS plain text" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "template" && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/resume/build">
                <PencilRuler className="h-4 w-4" />
                Edit details
              </Link>
            </Button>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              variant="warm"
              size="sm"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        )}
      </div>

      {tab === "template" ? (
        <div className="flex-1 overflow-auto rounded-lg border bg-white shadow-inner">
          <ResumeTemplate parsed={parsed} />
        </div>
      ) : (
        <AtsResumePreview versions={atsVersion} fileLabel={fileLabel} />
      )}
    </div>
  );
}
