"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generateCoverLetter,
  generateInterviewPrep,
  tailorResumeToJob,
  type InterviewPrep,
  type TailorResult,
} from "@/lib/ai";
import { buildAtsText } from "@/lib/resume-format";
import type { Job, ParsedResume, Resume } from "@/lib/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

type Ctx =
  | { ok: false; error: string }
  | { ok: true; supabase: ReturnType<typeof createClient>; resume: Resume };

async function getContext(): Promise<Ctx> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!resume?.parsed_json) {
    return {
      ok: false,
      error: "Add a resume first — upload one or build it on the Resume page.",
    };
  }
  return { ok: true, supabase, resume: resume as Resume };
}

async function getJob(supabase: ReturnType<typeof createClient>, jobId: string) {
  const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  return (data as Job) ?? null;
}

function missingKey(err: unknown): boolean {
  return err instanceof Error && err.message.includes("GROQ_API_KEY");
}

export async function coverLetterAction(
  jobId: string
): Promise<Result<string>> {
  const ctx = await getContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const job = await getJob(ctx.supabase, jobId);
  if (!job) return { ok: false, error: "Job not found." };

  try {
    const letter = await generateCoverLetter(
      ctx.resume.parsed_json as ParsedResume,
      job
    );
    return { ok: true, data: letter };
  } catch (err) {
    return {
      ok: false,
      error: missingKey(err)
        ? "AI is not configured (missing GROQ_API_KEY)."
        : "Couldn't generate the cover letter. Please try again.",
    };
  }
}

export async function interviewPrepAction(
  roleTitle: string
): Promise<Result<InterviewPrep>> {
  const ctx = await getContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = ctx.resume.parsed_json as ParsedResume;
  const role = roleTitle?.trim() || parsed.role_title || "Software Engineer";

  try {
    const prep = await generateInterviewPrep(parsed, role);
    return { ok: true, data: prep };
  } catch (err) {
    return {
      ok: false,
      error: missingKey(err)
        ? "AI is not configured (missing GROQ_API_KEY)."
        : "Couldn't generate interview prep. Please try again.",
    };
  }
}

export async function tailorResumeAction(
  jobId: string
): Promise<Result<TailorResult>> {
  const ctx = await getContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const job = await getJob(ctx.supabase, jobId);
  if (!job) return { ok: false, error: "Job not found." };

  const parsed = ctx.resume.parsed_json as ParsedResume;
  const atsText =
    ctx.resume.ats_text && ctx.resume.ats_text.length > 40
      ? ctx.resume.ats_text
      : buildAtsText(parsed);

  try {
    const result = await tailorResumeToJob(parsed, atsText, job);
    if (!result.tailoredText) throw new Error("empty");
    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: missingKey(err)
        ? "AI is not configured (missing GROQ_API_KEY)."
        : "Couldn't tailor the resume. Please try again.",
    };
  }
}
