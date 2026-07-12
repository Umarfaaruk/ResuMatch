// Deterministic ATS-readiness scorer. Pure JS — no AI cost. Grades the
// structured resume the same way ATS screeners and recruiters skim it.
import type { ParsedResume } from "./types";

export interface AtsCheck {
  label: string;
  score: number; // points earned
  max: number; // points available
  suggestion: string; // shown when points are lost
}

export interface AtsScore {
  total: number; // 0–100
  checks: AtsCheck[];
  suggestions: string[]; // top improvements, worst-first
}

const METRIC_RE = /\d+(\.\d+)?\s*(%|x|k|\+|lakh|crore|users|fps|ms|hrs?|days?)?/i;
const ACTION_VERB_RE =
  /^(built|created|developed|designed|led|launched|implemented|architected|improved|optimized|reduced|increased|delivered|automated|deployed|migrated|integrated|engineered|analyzed|managed|spearheaded|contributed|collaborated|achieved|trained|streamlined|researched|maintained|tested|debugged|shipped)/i;

export function scoreResume(p: ParsedResume): AtsScore {
  const checks: AtsCheck[] = [];

  // Contact details — ATS and recruiters need every channel. (20)
  const contactParts = [
    { ok: !!p.name?.trim(), what: "your full name" },
    { ok: !!p.email?.trim(), what: "an email address" },
    { ok: !!p.phone?.trim(), what: "a phone number" },
    { ok: (p.links?.length ?? 0) > 0, what: "a LinkedIn/GitHub link" },
  ];
  const missing = contactParts.filter((c) => !c.ok).map((c) => c.what);
  checks.push({
    label: "Contact details",
    score: contactParts.filter((c) => c.ok).length * 5,
    max: 20,
    suggestion: `Add ${missing.join(", ")} — recruiters reject resumes they can't reply to.`,
  });

  // Professional summary. (10)
  const summaryLen = p.summary?.trim().length ?? 0;
  checks.push({
    label: "Summary",
    score: summaryLen >= 120 ? 10 : summaryLen >= 40 ? 6 : 0,
    max: 10,
    suggestion:
      "Write a 2–3 sentence summary naming your target role, strongest skills, and one real achievement.",
  });

  // Skills coverage. (15)
  const skillCount = p.skills.length;
  checks.push({
    label: "Skills",
    score: Math.min(15, Math.round((skillCount / 10) * 15)),
    max: 15,
    suggestion:
      "List at least 10 concrete technical skills — ATS keyword-matches them against the job description.",
  });

  // Experience / projects with strong bullets. (30)
  const bullets = [
    ...p.experience.flatMap((e) => e.highlights),
    ...(p.projects ?? []).map((pr) => pr.description),
  ].filter(Boolean);
  const hasContent = p.experience.length > 0 || (p.projects?.length ?? 0) > 0;
  const verbShare = bullets.length
    ? bullets.filter((b) => ACTION_VERB_RE.test(b.trim())).length / bullets.length
    : 0;
  const metricShare = bullets.length
    ? bullets.filter((b) => METRIC_RE.test(b)).length / bullets.length
    : 0;
  checks.push({
    label: "Experience & projects",
    score:
      (hasContent ? 10 : 0) +
      Math.round(verbShare * 10) +
      Math.round(metricShare * 10),
    max: 30,
    suggestion:
      "Start every bullet with an action verb (Built, Improved, Led…) and add numbers — %, users, time saved. Quantified bullets are what recruiters read first.",
  });

  // Education. (10)
  checks.push({
    label: "Education",
    score: p.education.length > 0 ? 10 : 0,
    max: 10,
    suggestion: "Add your degree, institution, and year.",
  });

  // Length — one tight page reads best for freshers. (15)
  const wordCount = [
    p.summary ?? "",
    ...bullets,
    ...p.skills,
    ...p.experience.map((e) => `${e.title} ${e.company}`),
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  checks.push({
    label: "Length",
    score:
      wordCount >= 250 && wordCount <= 700
        ? 15
        : wordCount >= 150 && wordCount <= 900
          ? 9
          : 4,
    max: 15,
    suggestion:
      wordCount < 250
        ? "Your resume is thin — expand each role/project to 3–5 detailed bullets."
        : "Trim to the strongest content — aim for one focused page (250–700 words).",
  });

  const total = Math.min(
    100,
    checks.reduce((s, c) => s + c.score, 0)
  );
  const suggestions = checks
    .filter((c) => c.score < c.max)
    .sort((a, b) => a.score / a.max - b.score / b.max)
    .slice(0, 3)
    .map((c) => c.suggestion);

  return { total, checks, suggestions };
}
