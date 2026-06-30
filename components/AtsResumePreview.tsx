"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface AtsResumePreviewProps {
  atsText: string;
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
  atsText,
  fileLabel = "resume",
}: AtsResumePreviewProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = React.useState(false);

  const lines = React.useMemo(() => atsText.split("\n"), [atsText]);

  async function handleDownload() {
    setDownloading(true);
    try {
      // jsPDF is loaded lazily so it never ships in the initial bundle.
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });

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

      for (const raw of lines) {
        const line = raw.replace(/\s+$/g, "");

        if (line.trim() === "") {
          y += lineHeight * 0.6;
          continue;
        }

        const heading = isHeading(line);
        doc.setFont("times", heading ? "bold" : "normal");
        doc.setFontSize(heading ? 12 : 11);

        const wrapped: string[] = doc.splitTextToSize(line, maxWidth);
        for (const piece of wrapped) {
          addPageIfNeeded(lineHeight);
          doc.text(piece, marginX, y);
          y += lineHeight;
        }
        if (heading) {
          // underline rule beneath headings
          addPageIfNeeded(4);
          doc.setDrawColor(180);
          doc.line(marginX, y - lineHeight + 3, pageWidth - marginX, y - lineHeight + 3);
          y += 2;
        }
      }

      const safe = fileLabel.replace(/[^a-zA-Z0-9._-]/g, "_");
      doc.save(`${safe}-ATS.pdf`);
      toast({ title: "Downloaded ATS PDF", variant: "success" });
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
      <div className="mb-3 flex items-center justify-end">
        <Button onClick={handleDownload} disabled={downloading} variant="warm" size="sm">
          <Download className="h-4 w-4" />
          {downloading ? "Preparing…" : "Download ATS PDF"}
        </Button>
      </div>
      {/* ATS-safe rendering: single column, serif, no tables/graphics */}
      <div className="flex-1 overflow-auto rounded-lg border bg-white p-8 shadow-inner">
        <div className="mx-auto max-w-[640px] font-serif text-[13px] leading-relaxed text-neutral-800">
          {lines.map((line, i) => {
            if (line.trim() === "")
              return <div key={i} className="h-3" aria-hidden />;
            if (isHeading(line)) {
              return (
                <h3
                  key={i}
                  className="mb-1 mt-4 border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide text-neutral-900 first:mt-0"
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
