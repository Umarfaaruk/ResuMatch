"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface ResumeVersion {
  key: string;
  label: string;
  text: string;
  /** Serif (ATS/traditional) vs sans-serif (humanized/modern) rendering. */
  serif: boolean;
}

interface AtsResumePreviewProps {
  versions: ResumeVersion[];
  /** Used to name the downloaded file. */
  fileLabel?: string;
}

/** Heuristic: a line is a section heading if it's short & mostly uppercase. */
function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 40) return false;
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase();
}

export function AtsResumePreview({
  versions,
  fileLabel = "resume",
}: AtsResumePreviewProps) {
  const { toast } = useToast();
  const [active, setActive] = React.useState(0);
  const [downloading, setDownloading] = React.useState(false);

  const current = versions[active] ?? versions[0];
  const lines = React.useMemo(
    () => (current?.text ?? "").split("\n"),
    [current]
  );

  async function handleDownload() {
    if (!current) return;
    setDownloading(true);
    try {
      // jsPDF is loaded lazily so it never ships in the initial bundle.
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const fontFamily = current.serif ? "times" : "helvetica";

      const marginX = 48;
      const marginTop = 56;
      const marginBottom = 56;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - marginX * 2;
      const lineHeight = 15;
      let y = marginTop;

      const addPageIfNeeded = (needed: number) => {
        if (y + needed > pageHeight - marginBottom) {
          doc.addPage();
          y = marginTop;
        }
      };

      lines.forEach((raw, idx) => {
        const line = raw.replace(/\s+$/g, "");

        if (line.trim() === "") {
          y += lineHeight * 0.6;
          return;
        }

        // Treat the very first non-empty line as the name (larger).
        const isName = idx === 0 && line.trim().length <= 60;
        const heading = !isName && isHeading(line);

        doc.setFont(fontFamily, heading || isName ? "bold" : "normal");
        doc.setFontSize(isName ? 16 : heading ? 12 : 11);

        const wrapped: string[] = doc.splitTextToSize(line, maxWidth);
        for (const piece of wrapped) {
          addPageIfNeeded(lineHeight);
          doc.text(piece, marginX, y);
          y += lineHeight;
        }
        if (heading) {
          addPageIfNeeded(4);
          doc.setDrawColor(180);
          doc.line(
            marginX,
            y - lineHeight + 3,
            pageWidth - marginX,
            y - lineHeight + 3
          );
          y += 2;
        }
      });

      const safe = `${fileLabel}-${current.key}`.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );
      doc.save(`${safe}.pdf`);
      toast({ title: `Downloaded ${current.label} PDF`, variant: "success" });
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
          {versions.map((v, i) => (
            <button
              key={v.key}
              onClick={() => setActive(i)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                i === active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
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

      <div className="flex-1 overflow-auto rounded-lg border bg-white p-8 shadow-inner">
        <div
          className={cn(
            "mx-auto max-w-[640px] text-[13px] leading-relaxed text-neutral-800",
            current?.serif ? "font-serif" : "font-sans"
          )}
        >
          {lines.map((line, i) => {
            if (line.trim() === "")
              return <div key={i} className="h-3" aria-hidden />;
            if (i === 0 && line.trim().length <= 60) {
              return (
                <p
                  key={i}
                  className="mb-0.5 text-lg font-bold text-neutral-900"
                >
                  {line}
                </p>
              );
            }
            if (isHeading(line)) {
              return (
                <h3
                  key={i}
                  className="mb-1 mt-4 border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide text-neutral-900"
                >
                  {line.trim()}
                </h3>
              );
            }
            return (
              <p key={i} className="whitespace-pre-wrap">
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
