import "server-only";
import { getGroqClient, getGroqModel } from "./groq";
import type { Job, ParsedResume } from "./types";

function resumeSummaryForPrompt(p: ParsedResume): string {
  const lines: string[] = [];
  if (p.name) lines.push(`Name: ${p.name}`);
  lines.push(`Target role: ${p.role_title} (${p.experience_level})`);
  if (p.skills.length) lines.push(`Skills: ${p.skills.join(", ")}`);
  if (p.experience.length) {
    lines.push("Experience:");
    for (const e of p.experience) {
      lines.push(
        `- ${[e.title, e.company, e.duration].filter(Boolean).join(", ")}`
      );
      for (const h of e.highlights.slice(0, 4)) lines.push(`  • ${h}`);
    }
  }
  if (p.projects?.length) {
    lines.push("Projects:");
    for (const pr of p.projects)
      lines.push(`- ${pr.name}: ${pr.description}`);
  }
  if (p.education.length) {
    lines.push("Education:");
    for (const e of p.education)
      lines.push(
        `- ${[e.degree, e.institution, e.year].filter(Boolean).join(", ")}`
      );
  }
  return lines.join("\n");
}

/** Strip code fences and parse a JSON object from a model response. */
function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s !== -1 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new Error("AI returned invalid JSON.");
  }
}

function strArr(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : [];
}

// ── Cover letter ────────────────────────────────────────────────────────────
export async function generateCoverLetter(
  parsed: ParsedResume,
  job: Job
): Promise<string> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: getGroqModel(),
    temperature: 0.5,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You write concise, genuine cover letters for entry-level candidates in India. 200-300 words, 3 short paragraphs. Confident but not arrogant; specific to the role; never invent facts not in the candidate's background. Plain text only, no markdown. End with 'Sincerely,' and the candidate's name if known.",
      },
      {
        role: "user",
        content: `CANDIDATE:\n${resumeSummaryForPrompt(parsed)}\n\nJOB:\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nRequired skills: ${job.required_skills.join(", ")}\nDescription: ${job.description}\n\nWrite the cover letter.`,
      },
    ],
  });
  return (completion.choices[0]?.message?.content ?? "").trim();
}

// ── Interview prep ──────────────────────────────────────────────────────────
export interface InterviewQuestion {
  question: string;
  tip: string;
}
export interface InterviewPrep {
  technical: InterviewQuestion[];
  behavioral: InterviewQuestion[];
  tips: string[];
}

export async function generateInterviewPrep(
  parsed: ParsedResume,
  roleTitle: string
): Promise<InterviewPrep> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: getGroqModel(),
    temperature: 0.4,
    max_tokens: 2200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an interview coach for entry-level tech candidates in India. Produce realistic interview questions tailored to the role and the candidate's background, each with a short, actionable answer tip (not a full answer). Return STRICT JSON only: { \"technical\": [{\"question\": string, \"tip\": string}], \"behavioral\": [{\"question\": string, \"tip\": string}], \"tips\": string[] }. Give 6 technical, 5 behavioral, and 4 general tips.",
      },
      {
        role: "user",
        content: `ROLE: ${roleTitle}\n\nCANDIDATE:\n${resumeSummaryForPrompt(parsed)}`,
      },
    ],
  });

  const data = parseJsonObject(completion.choices[0]?.message?.content ?? "");
  const mapQ = (v: unknown): InterviewQuestion[] =>
    Array.isArray(v)
      ? (v as Record<string, unknown>[])
          .map((q) => ({ question: String(q?.question ?? "").trim(), tip: String(q?.tip ?? "").trim() }))
          .filter((q) => q.question)
      : [];

  return {
    technical: mapQ(data.technical),
    behavioral: mapQ(data.behavioral),
    tips: strArr(data.tips),
  };
}

// ── Tailor resume to a job ──────────────────────────────────────────────────
export interface TailorResult {
  tailoredText: string;
  addedKeywords: string[];
  notes: string;
}

export async function tailorResumeToJob(
  parsed: ParsedResume,
  currentAtsText: string,
  job: Job
): Promise<TailorResult> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: getGroqModel(),
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You tailor an ATS-safe resume to a specific job WITHOUT inventing experience. Reorder/rephrase to surface the most relevant skills and naturally weave in the job's keywords ONLY where the candidate plausibly has them. Keep it single-column plain text with UPPERCASE headings and '- ' bullets. Return STRICT JSON only: { \"tailoredText\": string, \"addedKeywords\": string[], \"notes\": string }. addedKeywords = job keywords you emphasized; notes = 1-2 sentences on what changed and any honest gaps to address.",
      },
      {
        role: "user",
        content: `JOB:\nTitle: ${job.title} at ${job.company}\nRequired skills: ${job.required_skills.join(", ")}\nDescription: ${job.description}\n\nCANDIDATE STRUCTURED:\n${resumeSummaryForPrompt(parsed)}\n\nCURRENT ATS RESUME:\n"""\n${currentAtsText.slice(0, 8000)}\n"""`,
      },
    ],
  });

  const data = parseJsonObject(completion.choices[0]?.message?.content ?? "");
  return {
    tailoredText: String(data.tailoredText ?? "").trim(),
    addedKeywords: strArr(data.addedKeywords),
    notes: String(data.notes ?? "").trim(),
  };
}
