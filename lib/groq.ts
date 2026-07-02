import OpenAI from "openai";
import type { ParsedResume, ExperienceLevel } from "./types";
import { buildAtsText, buildHumanizedText } from "./resume-format";
import { repairInterleavedText } from "./resume-format";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

/** Shared Groq (OpenAI-compatible) client. Throws if the key is missing. */
export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
}

export function getGroqModel() {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

const getClient = getGroqClient;

export interface ParseResult {
  parsed: ParsedResume;
  ats_text: string;
}

const SYSTEM_PROMPT = `You are an expert technical recruiter and resume writer specializing in ATS (Applicant Tracking System) optimization for entry-level candidates in India.

You will receive the raw text of a candidate's resume. Extract COMPLETE, polished structured data (the app renders the final resume from it).

The raw text may contain extraction artifacts (stray '&' between letters, broken words, jumbled line order). Silently reconstruct the intended words and sentences — never copy garbled text into your output.

Quality rules:
- "summary": 3 polished sentences — role focus, strongest skills, and one concrete strength or achievement with real metrics. Write one even if the source lacks it, based only on real content.
- "experience" highlights: 3-5 strong bullets per role. Rewrite each as a professional accomplishment statement: action verb + what was built + technologies + outcome/impact. Expand terse fragments into full statements; keep every real metric. No trailing periods inconsistency; no bullet characters inside the strings.
- "projects": include every project with a detailed 1-2 sentence description and its tech list.
- "skills": concise and deduplicated (aim for 20-25 max). Merge granular variants — e.g. individual metric names (mAP, F1-score, precision, recall) become "model evaluation"; drop generic soft skills and near-duplicates.
- Include EVERY skill, experience, project, and education entry present in the source. Never drop details.
- "links": full URLs exactly as they appear in the source (e.g. "https://github.com/user"), never bare usernames.
- Never invent facts, employers, dates, or numbers that are not in the source.

Return STRICT JSON only (no markdown, no commentary) matching exactly this shape:
{
  "name": string,
  "email": string,
  "phone": string,
  "location": string,
  "links": string[],
  "summary": string,
  "skills": string[],                // deduplicated technical & relevant skills, lowercase
  "experience": [{ "title": string, "company": string, "duration": string, "highlights": string[] }],
  "projects": [{ "name": string, "description": string, "tech": string[] }],
  "education": [{ "degree": string, "institution": string, "year": string }],
  "role_title": string,              // single best-fit target job title, e.g. "Frontend Developer"
  "experience_level": "fresher" | "junior" | "mid"   // freshers <1y, junior 1-2y, mid 3y+
}`;

const ALLOWED_LEVELS: ExperienceLevel[] = ["fresher", "junior", "mid"];

/** Calls Groq to parse + rewrite a resume from its raw extracted text. */
export async function parseResumeText(rawText: string): Promise<ParseResult> {
  const client = getClient();
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  // Keep input + completion inside Groq's free-tier 8k tokens-per-minute
  // budget: ~10k chars of resume (~2.5k tokens) + prompt + 4k completion.
  // The model returns structured data only (the resume texts are rendered
  // deterministically from it), but gpt-oss models also spend completion
  // tokens on hidden reasoning, so the cap needs headroom.
  const trimmed = rawText.slice(0, 10000);

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 4000,
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
    .map((s) => repairInterleavedText(s).trim())
    .filter(Boolean);
}

function str(v: unknown): string {
  return typeof v === "string" ? repairInterleavedText(v).trim() : "";
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

  // Render both resume versions deterministically from the structured data.
  // This guarantees a complete document (contact header, formatted skills,
  // every section) and keeps the AI completion small enough for free tiers.
  const ats_text = buildAtsText(parsed);
  parsed.humanized_text = buildHumanizedText(parsed);

  return { parsed, ats_text };
}
