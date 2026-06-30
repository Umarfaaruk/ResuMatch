"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseResumeText } from "@/lib/groq";
import { buildAtsText, buildHumanizedText } from "@/lib/resume-format";
import type { ExperienceLevel, ParsedResume } from "@/lib/types";

export interface BuilderInput {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
  summary?: string;
  skills?: string[];
  experience?: {
    title: string;
    company: string;
    duration: string;
    highlights: string[];
  }[];
  projects?: { name: string; description: string; tech: string[] }[];
  education?: { degree: string; institution: string; year: string }[];
  role_title?: string;
  experience_level?: ExperienceLevel;
}

const LEVELS: ExperienceLevel[] = ["fresher", "junior", "mid"];

function clean(s?: string): string {
  return (s ?? "").trim();
}
function cleanArr(a?: string[]): string[] {
  return (a ?? []).map((x) => clean(x)).filter(Boolean);
}

export async function buildResume(
  input: BuilderInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  // Assemble the user's structured data (the source of truth).
  const parsed: ParsedResume = {
    name: clean(input.name) || undefined,
    email: clean(input.email) || undefined,
    phone: clean(input.phone) || undefined,
    location: clean(input.location) || undefined,
    links: cleanArr(input.links),
    summary: clean(input.summary) || undefined,
    skills: Array.from(
      new Set(cleanArr(input.skills).map((s) => s.toLowerCase()))
    ),
    experience: (input.experience ?? [])
      .map((e) => ({
        title: clean(e.title),
        company: clean(e.company),
        duration: clean(e.duration),
        highlights: cleanArr(e.highlights),
      }))
      .filter((e) => e.title || e.company || e.highlights.length),
    projects: (input.projects ?? [])
      .map((p) => ({
        name: clean(p.name),
        description: clean(p.description),
        tech: cleanArr(p.tech),
      }))
      .filter((p) => p.name || p.description),
    education: (input.education ?? [])
      .map((e) => ({
        degree: clean(e.degree),
        institution: clean(e.institution),
        year: clean(e.year),
      }))
      .filter((e) => e.degree || e.institution),
    role_title: clean(input.role_title) || "Software Engineer",
    experience_level: LEVELS.includes(input.experience_level as ExperienceLevel)
      ? (input.experience_level as ExperienceLevel)
      : "fresher",
  };

  if (parsed.skills.length === 0 && parsed.experience.length === 0) {
    return {
      ok: false,
      error: "Add at least your skills or one experience entry.",
    };
  }

  // Produce polished prose. Prefer AI; fall back to deterministic builders so
  // this always works even without a Groq key. We keep the user's structured
  // data as-is and only adopt the AI's rewritten text.
  let atsText = buildAtsText(parsed);
  let humanizedText = buildHumanizedText(parsed);
  try {
    const ai = await parseResumeText(atsText);
    if (ai.ats_text && ai.ats_text.length > 80) atsText = ai.ats_text;
    if (ai.parsed.humanized_text && ai.parsed.humanized_text.length > 80) {
      humanizedText = ai.parsed.humanized_text;
    }
  } catch {
    /* keep deterministic versions */
  }
  parsed.humanized_text = humanizedText;

  await supabase
    .from("resumes")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { error } = await supabase.from("resumes").insert({
    user_id: user.id,
    original_file_path: "builder",
    parsed_json: parsed,
    ats_text: atsText,
    is_active: true,
  });

  if (error) return { ok: false, error: "Failed to save your resume." };

  revalidatePath("/resume");
  revalidatePath("/dashboard");
  return { ok: true };
}
