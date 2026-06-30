import type { Job, MatchedJob, ParsedResume, ExperienceLevel } from "./types";

// Scoring weights (must sum to 1).
const W_SKILLS = 0.6;
const W_ROLE = 0.25;
const W_EXPERIENCE = 0.15;

const EXP_RANK: Record<ExperienceLevel, number> = {
  fresher: 0,
  junior: 1,
  mid: 2,
};

/** Normalize a skill/role token: lowercase, trim, collapse separators. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[._/]+/g, " ")
    .replace(/[^a-z0-9+# ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSet(items: string[]): Set<string> {
  return new Set(items.map(norm).filter(Boolean));
}

/** Jaccard similarity between two token sets. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Fuzzy role-title similarity: word-overlap (Jaccard) on the title words,
 * with a small boost when one title contains the other.
 */
function roleSimilarity(resumeRole: string, jobRole: string): number {
  const a = toSet(resumeRole.split(/\s+/));
  const b = toSet(jobRole.split(/\s+/));
  let score = jaccard(a, b);
  const na = norm(resumeRole);
  const nb = norm(jobRole);
  if (na && nb && (na.includes(nb) || nb.includes(na))) {
    score = Math.max(score, 0.85);
  }
  return score;
}

/** Experience-level closeness: exact = 1, adjacent = 0.5, else 0. */
function experienceSimilarity(a: ExperienceLevel, b: ExperienceLevel): number {
  const diff = Math.abs(EXP_RANK[a] - EXP_RANK[b]);
  if (diff === 0) return 1;
  if (diff === 1) return 0.5;
  return 0;
}

/**
 * Score and rank jobs against a parsed resume. Pure JS — no AI cost.
 * Returns the top `limit` jobs with matchScore (0–100) and skill diffs.
 */
export function getMatchedJobs(
  resume: ParsedResume,
  jobs: Job[],
  limit = 20
): MatchedJob[] {
  const resumeSkillSet = toSet(resume.skills ?? []);

  const scored: MatchedJob[] = jobs.map((job) => {
    const jobSkillSet = toSet(job.required_skills ?? []);

    const skillScore = jaccard(resumeSkillSet, jobSkillSet);
    const roleScore = roleSimilarity(
      resume.role_title ?? "",
      job.role_title ?? ""
    );
    const expScore = experienceSimilarity(
      resume.experience_level ?? "fresher",
      job.experience_level
    );

    const total =
      W_SKILLS * skillScore + W_ROLE * roleScore + W_EXPERIENCE * expScore;

    // Partition original (non-normalized) skill labels for display.
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    for (const skill of job.required_skills ?? []) {
      if (resumeSkillSet.has(norm(skill))) matchedSkills.push(skill);
      else missingSkills.push(skill);
    }

    return {
      ...job,
      matchScore: Math.round(total * 100),
      matchedSkills,
      missingSkills,
    };
  });

  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
