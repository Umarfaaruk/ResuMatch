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
  const [viewMode, setViewMode] = React.useState<"ats" | "human">("ats");

  const lines = React.useMemo(() => atsText.split("\n"), [atsText]);

  async function handleDownload(mode: "ats" | "human") {
    setDownloading(true);
    try {
      // jsPDF is loaded lazily so it never ships in the initial bundle.
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const marginX = 54;
      const marginTop = 54;
      const marginBottom = 54;
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

      if (mode === "human") {
        // Humanized/Professional PDF layout styling
        let nameFound = false;
        let contactFound = false;

        for (const raw of lines) {
          const line = raw.replace(/\s+$/g, "");

          if (line.trim() === "") {
            y += lineHeight * 0.5;
            continue;
          }

          const heading = isHeading(line);

          if (!nameFound && !heading) {
            nameFound = true;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42); // slate-900

            const wrapped = doc.splitTextToSize(line, maxWidth);
            for (const piece of wrapped) {
              addPageIfNeeded(22);
              doc.text(piece, marginX, y);
              y += 22;
            }
            y += 4;
            continue;
          }

          if (nameFound && !contactFound && !heading) {
            contactFound = true;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105); // slate-600

            const wrapped = doc.splitTextToSize(line, maxWidth);
            for (const piece of wrapped) {
              addPageIfNeeded(12);
              doc.text(piece, marginX, y);
              y += 12;
            }
            y += 10;
            continue;
          }

          if (heading) {
            y += 8;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59); // slate-800

            addPageIfNeeded(16);
            doc.text(line.toUpperCase(), marginX, y);
            y += 14;

            // Stylish divider line below heading
            addPageIfNeeded(4);
            doc.setDrawColor(203, 213, 225); // slate-300
            doc.setLineWidth(1);
            doc.line(marginX, y - 8, pageWidth - marginX, y - 8);
            y += 4;
          } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85); // slate-700

            const wrapped = doc.splitTextToSize(line, maxWidth);
            for (const piece of wrapped) {
              addPageIfNeeded(lineHeight);
              doc.text(piece, marginX, y);
              y += lineHeight;
            }
          }
        }

        const safe = fileLabel.replace(/[^a-zA-Z0-9._-]/g, "_");
        doc.save(`${safe}-Professional.pdf`);
        toast({ title: "Downloaded Professional PDF", variant: "success" });
      } else {
        // ATS-safe PDF layout styling
        doc.setTextColor(0, 0, 0); // Always ensure black text

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
      }
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
      {/* View Mode Switcher and Download Button */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setViewMode("ats")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "ats"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ATS (Machine-Friendly)
          </button>
          <button
            onClick={() => setViewMode("human")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "human"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Professional (Human-Friendly)
          </button>
        </div>

        <Button
          onClick={() => handleDownload(viewMode)}
          disabled={downloading}
          variant={viewMode === "human" ? "default" : "warm"}
          size="sm"
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-1.5" />
          {downloading
            ? "Preparing…"
            : viewMode === "human"
            ? "Download Professional PDF"
            : "Download ATS PDF"}
        </Button>
      </div>

      {/* Render Workspace Preview */}
      <div className="flex-1 overflow-auto rounded-lg border bg-white p-8 shadow-inner">
        {viewMode === "ats" ? (
          /* ATS-safe rendering: single column, serif, no tables/graphics */
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
        ) : (
          /* Human-friendly rendering: modern sans-serif, colored headings, clean margins */
          <div className="mx-auto max-w-[640px] font-sans text-[13.5px] leading-relaxed text-slate-700">
            {(() => {
              let nameFound = false;
              let contactFound = false;
              return lines.map((line, i) => {
                const trimmed = line.trim();
                if (trimmed === "")
                  return <div key={i} className="h-3" aria-hidden />;

                const heading = isHeading(line);

                if (!nameFound && !heading) {
                  nameFound = true;
                  return (
                    <h1
                      key={i}
                      className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1"
                    >
                      {trimmed}
                    </h1>
                  );
                }

                if (nameFound && !contactFound && !heading) {
                  contactFound = true;
                  return (
                    <div
                      key={i}
                      className="text-xs font-normal text-slate-500 tracking-wide mb-5 pb-2 border-b border-slate-100"
                    >
                      {trimmed}
                    </div>
                  );
                }

                if (heading) {
                  return (
                    <h2
                      key={i}
                      className="mb-2 mt-6 border-b border-slate-200 pb-1 text-[13px] font-bold uppercase tracking-wider text-slate-800 first:mt-0"
                    >
                      {trimmed}
                    </h2>
                  );
                }

                return (
                  <p key={i} className="whitespace-pre-wrap mb-1.5 text-slate-600">
                    {line}
                  </p>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

