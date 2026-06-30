import OpenAI from "openai";
import type { ParsedResume, ExperienceLevel } from "./types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
}

export interface ParseResult {
  parsed: ParsedResume;
  ats_text: string;
}

const SYSTEM_PROMPT = `You are an expert technical recruiter and resume writer specializing in ATS (Applicant Tracking System) optimization for entry-level candidates in India.

You will receive the raw text of a candidate's resume. Do two things:
1. Extract structured data from it.
2. Rewrite it as a clean, ATS-safe plain-text resume.

ATS-safe rules for "ats_text":
- Single column, no tables, no columns, no graphics, no special characters for bullets (use "- ").
- Clear UPPERCASE section headings: SUMMARY, SKILLS, EXPERIENCE, EDUCATION, PROJECTS (include only sections that have content).
- Use strong action verbs and quantify achievements where the source allows. Do NOT invent facts, employers, dates, or numbers that are not present.
- Keep contact info on the first lines if present in the source.

Return STRICT JSON only (no markdown, no commentary) matching exactly this shape:
{
  "skills": string[],            // deduplicated technical & relevant skills, lowercase
  "experience": [{ "title": string, "company": string, "duration": string, "highlights": string[] }],
  "education": [{ "degree": string, "institution": string, "year": string }],
  "role_title": string,          // the single best-fit target job title, e.g. "Frontend Developer"
  "experience_level": "fresher" | "junior" | "mid",  // freshers have <1y, junior 1-2y, mid 3y+
  "ats_text": string             // the full rewritten ATS-safe resume as plain text with \n line breaks
}`;

const ALLOWED_LEVELS: ExperienceLevel[] = ["fresher", "junior", "mid"];

/** Calls Groq to parse + rewrite a resume from its raw extracted text. */
export async function parseResumeText(rawText: string): Promise<ParseResult> {
  const client = getClient();
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  // Guard against very long inputs blowing the context window.
  const trimmed = rawText.slice(0, 24000);

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Raw resume text:\n"""\n${trimmed}\n"""`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const data = safeParseJson(content);

  return normalizeResult(data);
}

/** Extract a JSON object even if the model wraps it in stray text/fences. */
function safeParseJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new Error("Groq returned invalid JSON for the resume.");
  }
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeResult(data: Record<string, unknown>): ParseResult {
  const level = String(data.experience_level ?? "fresher").toLowerCase();
  const experience_level: ExperienceLevel = ALLOWED_LEVELS.includes(
    level as ExperienceLevel
  )
    ? (level as ExperienceLevel)
    : "fresher";

  const experience = Array.isArray(data.experience)
    ? (data.experience as Record<string, unknown>[]).map((e) => ({
        title: String(e?.title ?? ""),
        company: String(e?.company ?? ""),
        duration: String(e?.duration ?? ""),
        highlights: asStringArray(e?.highlights),
      }))
    : [];

  const education = Array.isArray(data.education)
    ? (data.education as Record<string, unknown>[]).map((e) => ({
        degree: String(e?.degree ?? ""),
        institution: String(e?.institution ?? ""),
        year: String(e?.year ?? ""),
      }))
    : [];

  // Dedupe skills (lowercased).
  const skills = Array.from(
    new Set(asStringArray(data.skills).map((s) => s.toLowerCase()))
  );

  const parsed: ParsedResume = {
    skills,
    experience,
    education,
    role_title: String(data.role_title ?? "").trim() || "Software Engineer",
    experience_level,
  };

  const ats_text = String(data.ats_text ?? "").trim();

  return { parsed, ats_text };
}
