"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, FileText, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Stage = "idle" | "uploading" | "parsing";

interface ResumeUploaderProps {
  /** Pass true to render the compact "replace resume" variant. */
  compact?: boolean;
}

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export function ResumeUploader({ compact = false }: ResumeUploaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = React.useMemo(() => createClient(), []);
  const [stage, setStage] = React.useState<Stage>("idle");

  const busy = stage !== "idle";

  const handleFile = React.useCallback(
    async (file: File) => {
      setStage("uploading");
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Your session expired. Please log in again.");

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (uploadError) throw uploadError;

        setStage("parsing");
        const res = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath, fileName: file.name }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Parsing failed. Please try again.");
        }

        toast({
          title: "Resume ready!",
          description: "Your ATS-optimized resume and matches are updated.",
          variant: "success",
        });
        router.refresh();
      } catch (err) {
        toast({
          title: "Upload failed",
          description:
            err instanceof Error ? err.message : "Something went wrong.",
          variant: "error",
        });
      } finally {
        setStage("idle");
      }
    },
    [router, supabase, toast]
  );

  const onDrop = React.useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        toast({
          title: "File not accepted",
          description:
            rejected[0]?.errors?.[0]?.message ||
            "Please upload a PDF or DOCX under 5 MB.",
          variant: "error",
        });
        return;
      }
      if (accepted[0]) handleFile(accepted[0]);
    },
    [handleFile, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: busy,
  });

  const stageLabel =
    stage === "uploading"
      ? "Uploading your file…"
      : stage === "parsing"
        ? "AI is parsing & optimizing…"
        : "";

  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium transition-colors",
          isDragActive ? "border-warm bg-warm/5" : "border-border hover:bg-accent",
          busy && "pointer-events-none opacity-70"
        )}
      >
        <input {...getInputProps()} />
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {stageLabel}
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Replace resume (PDF / DOCX)
          </>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
        isDragActive
          ? "border-warm bg-warm/5"
          : "border-border hover:border-primary/40 hover:bg-accent/40",
        busy && "pointer-events-none opacity-80"
      )}
    >
      <input {...getInputProps()} />
      <span
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-full",
          busy ? "bg-warm/15 text-warm" : "bg-primary/10 text-primary"
        )}
      >
        {busy ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : isDragActive ? (
          <FileText className="h-7 w-7" />
        ) : (
          <UploadCloud className="h-7 w-7" />
        )}
      </span>
      {busy ? (
        <p className="text-base font-semibold text-foreground">{stageLabel}</p>
      ) : (
        <>
          <p className="text-base font-semibold text-foreground">
            Drag & drop your resume, or click to browse
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF or DOCX · up to 5 MB
          </p>
        </>
      )}
    </div>
  );
}
