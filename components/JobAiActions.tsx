"use client";

import * as React from "react";
import {
  MoreVertical,
  FileSignature,
  Wand2,
  Loader2,
  Copy,
  Download,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { coverLetterAction, tailorResumeAction } from "@/app/actions/ai";
import { downloadTextAsPdf } from "@/lib/pdf-client";
import type { Job } from "@/lib/types";

// Local mirror to avoid importing server-only types.
export interface TailorData {
  tailoredText: string;
  addedKeywords: string[];
  notes: string;
}

type Mode = "cover" | "tailor" | null;

export function JobAiActions({ job }: { job: Job }) {
  const { toast } = useToast();
  const [mode, setMode] = React.useState<Mode>(null);
  const [loading, setLoading] = React.useState(false);
  const [letter, setLetter] = React.useState("");
  const [tailor, setTailor] = React.useState<TailorData | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function runCover() {
    setMode("cover");
    setLoading(true);
    setLetter("");
    const res = await coverLetterAction(job.id);
    setLoading(false);
    if (res.ok) setLetter(res.data);
    else {
      toast({ title: "Couldn't generate", description: res.error, variant: "error" });
      setMode(null);
    }
  }

  async function runTailor() {
    setMode("tailor");
    setLoading(true);
    setTailor(null);
    const res = await tailorResumeAction(job.id);
    setLoading(false);
    if (res.ok) setTailor(res.data as TailorData);
    else {
      toast({ title: "Couldn't tailor", description: res.error, variant: "error" });
      setMode(null);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "error" });
    }
  }

  const label = `${job.title}-${job.company}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="AI tools" title="AI tools">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              // Defer so the menu fully closes before the dialog opens
              // (prevents Radix leaving pointer-events:none on <body>).
              e.preventDefault();
              setTimeout(runCover, 0);
            }}
          >
            <FileSignature className="h-4 w-4" />
            Generate cover letter
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(runTailor, 0);
            }}
          >
            <Wand2 className="h-4 w-4" />
            Tailor my resume to this
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={mode !== null}
        onOpenChange={(o) => {
          if (!o) setMode(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-hidden">
          {mode === "cover" && (
            <>
              <DialogHeader>
                <DialogTitle>Cover letter</DialogTitle>
                <DialogDescription>
                  Tailored to {job.title} at {job.company}. Review and edit before sending.
                </DialogDescription>
              </DialogHeader>
              {loading ? (
                <Loading text="Writing your cover letter…" />
              ) : (
                <>
                  <textarea
                    value={letter}
                    onChange={(e) => setLetter(e.target.value)}
                    className="h-[45vh] w-full resize-none rounded-md border bg-background p-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyText(letter)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="warm"
                      size="sm"
                      onClick={() =>
                        downloadTextAsPdf(letter, `${label}-cover-letter`, {
                          serif: true,
                          headingRules: false,
                        })
                      }
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {mode === "tailor" && (
            <>
              <DialogHeader>
                <DialogTitle>Resume tailored to this job</DialogTitle>
                <DialogDescription>
                  Rephrased to mirror {job.company}&apos;s requirements — no invented experience.
                </DialogDescription>
              </DialogHeader>
              {loading ? (
                <Loading text="Tailoring your resume…" />
              ) : tailor ? (
                <div className="space-y-3 overflow-y-auto">
                  {tailor.addedKeywords.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Emphasized keywords
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {tailor.addedKeywords.map((k) => (
                          <Badge key={k} variant="warm">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {tailor.notes && (
                    <p className="rounded-md bg-secondary/60 p-3 text-sm text-muted-foreground">
                      {tailor.notes}
                    </p>
                  )}
                  <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-md border bg-white p-4 font-serif text-[13px] leading-relaxed text-neutral-800">
                    {tailor.tailoredText}
                  </pre>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyText(tailor.tailoredText)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="warm"
                      size="sm"
                      onClick={() =>
                        downloadTextAsPdf(tailor.tailoredText, `${label}-tailored`, {
                          serif: true,
                          headingRules: true,
                        })
                      }
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-warm" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
