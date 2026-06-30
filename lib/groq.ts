import OpenAI from "openai";
import type { ParsedResume, ExperienceLevel } from "./types";
import { buildAtsText, buildHumanizedText } from "./resume-format";

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

You will receive the raw text of a candidate's resume. Extract structured data AND produce two rewritten versions.

Rules for "ats_text" (machine-readable):
- Single column. No tables, no columns, no graphics. Use "- " for bullets.
- Clear UPPERCASE section headings: SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION (include only sections with content).
- Put the candidate's name on line 1 and contact details (email | phone | location | links) on line 2 when present.
- Strong action verbs; quantify achievements where the source allows. Never invent facts, employers, dates, or numbers.

Rules for "humanized_text" (recruiter-friendly):
- Same factual content, but warm and natural — like a thoughtful human wrote it, not keyword-stuffed.
- A compelling first-person-leaning profile paragraph, then experience/projects with concise, readable bullets.
- Still clean plain text with section headings; no tables or graphics.

BOTH "ats_text" and "humanized_text" are REQUIRED, must be non-empty, and are the two longest fields in your output.

Return STRICT JSON only (no markdown, no commentary) matching exactly this shape:
{
  "name": string,
  "email": string,
  "phone": string,
  "location": string,
  "links": string[],
  "summary": string,                 // 2-3 sentence professional summary
  "skills": string[],                // deduplicated technical & relevant skills, lowercase
  "experience": [{ "title": string, "company": string, "duration": string, "highlights": string[] }],
  "projects": [{ "name": string, "description": string, "tech": string[] }],
  "education": [{ "degree": string, "institution": string, "year": string }],
  "role_title": string,              // single best-fit target job title, e.g. "Frontend Developer"
  "experience_level": "fresher" | "junior" | "mid",  // freshers <1y, junior 1-2y, mid 3y+
  "ats_text": string,                // full ATS-safe resume, plain text with \n line breaks
  "humanized_text": string           // full humanized resume, plain text with \n line breaks
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
    max_tokens: 8000,
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

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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
        title: str(e?.title),
        company: str(e?.company),
        duration: str(e?.duration),
        highlights: asStringArray(e?.highlights),
      }))
    : [];

  const education = Array.isArray(data.education)
    ? (data.education as Record<string, unknown>[]).map((e) => ({
        degree: str(e?.degree),
        institution: str(e?.institution),
        year: str(e?.year),
      }))
    : [];

  const projects = Array.isArray(data.projects)
    ? (data.projects as Record<string, unknown>[]).map((pr) => ({
        name: str(pr?.name),
        description: str(pr?.description),
        tech: asStringArray(pr?.tech),
      }))
    : [];

  // Dedupe skills (lowercased).
  const skills = Array.from(
    new Set(asStringArray(data.skills).map((s) => s.toLowerCase()))
  );

  const parsed: ParsedResume = {
    name: str(data.name) || undefined,
    email: str(data.email) || undefined,
    phone: str(data.phone) || undefined,
    location: str(data.location) || undefined,
    links: asStringArray(data.links),
    summary: str(data.summary) || undefined,
    skills,
    experience,
    education,
    projects,
    role_title: str(data.role_title) || "Software Engineer",
    experience_level,
  };

  // Prefer the model's prose, but fall back to deterministic builders so the
  // UI is never empty (the AI sometimes leaves these long fields blank).
  let ats_text = str(data.ats_text);
  if (ats_text.length < 80) ats_text = buildAtsText(parsed);

  let humanized_text = str(data.humanized_text);
  if (humanized_text.length < 80) humanized_text = buildHumanizedText(parsed);

  parsed.humanized_text = humanized_text;

  return { parsed, ats_text };
}
