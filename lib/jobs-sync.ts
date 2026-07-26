// Server-only: pulls live job listings from free job APIs and upserts them
// into the public jobs table, replacing the fabricated seed data.
//
// Providers:
//   • Adzuna India (https://developer.adzuna.com) — real Indian listings with
//     a direct apply redirect URL. Enabled when ADZUNA_APP_ID/ADZUNA_APP_KEY
//     are set.
//   • Remotive (https://remotive.com) — keyless API of remote software jobs;
//     each listing links to its live posting with an Apply button.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExperienceLevel } from "./types";

interface LiveJob {
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: string[];
  role_title: string;
  experience_level: ExperienceLevel;
  source_url: string;
  posted_date: string; // YYYY-MM-DD
}

// Tech keywords scanned out of titles/descriptions to power skill matching.
const SKILL_KEYWORDS = [
  "python", "java", "javascript", "typescript", "react", "node.js", "next.js",
  "angular", "vue", "django", "flask", "fastapi", "spring", "php", "laravel",
  "ruby", "rails", "golang", "rust", "kotlin", "swift", "c++", "c#", "html",
  "css", "tailwind", "sql", "mysql", "postgresql", "mongodb", "redis",
  "graphql", "rest api", "aws", "azure", "gcp", "docker", "kubernetes",
  "terraform", "linux", "git", "ci/cd", "machine learning", "deep learning",
  "pytorch", "tensorflow", "nlp", "llm", "data analysis", "pandas", "numpy",
  "excel", "power bi", "tableau", "etl", "airflow", "spark", "kafka",
  "selenium", "jest", "cypress", "figma", "ui/ux", "devops", "agile",
  "data structures", "statistics",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSkills(text: string, max = 8): string[] {
  const hay = text.toLowerCase();
  const found: string[] = [];
  for (const kw of SKILL_KEYWORDS) {
    if (found.length >= max) break;
    const re = new RegExp(`(^|[^a-z0-9+#])${escapeRegex(kw)}([^a-z0-9+#]|$)`);
    if (re.test(hay)) found.push(kw);
  }
  return found;
}

function stripHtml(html: string): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&#\d+;|&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferLevel(title: string): ExperienceLevel {
  const t = title.toLowerCase();
  if (/intern|trainee|fresher|graduate|entry[- ]?level|associate/.test(t)) {
    return "fresher";
  }
  if (/junior|jr\.?\b/.test(t)) return "junior";
  return "mid";
}

function cleanRole(title: string): string {
  const cleaned = title
    .replace(/\(.*?\)/g, " ")
    .replace(
      /\b(senior|sr\.?|junior|jr\.?|lead|staff|principal|intern(ship)?|trainee|fresher|graduate|entry[- ]?level|remote|urgent|hiring)\b/gi,
      " "
    )
    .replace(/[|/,–—-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || title.trim();
}

function toDate(v: string | undefined): string {
  const d = (v ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d)
    ? d
    : new Date().toISOString().slice(0, 10);
}

// ── Providers ────────────────────────────────────────────────────────────────
// Per-provider cooldowns keep the feed fresh while staying far inside free
// quotas: Adzuna free tier is ~250 calls/day (call at most every 30 min);
// the keyless feeds are cached server-side anyway, so a few minutes is plenty.
const ADZUNA_COOLDOWN_MS = 30 * 60 * 1000;
const REMOTIVE_COOLDOWN_MS = 10 * 60 * 1000;
const JOBICY_COOLDOWN_MS = 5 * 60 * 1000;
const ARBEITNOW_COOLDOWN_MS = 5 * 60 * 1000;
let lastAdzunaAt = 0;
let lastRemotiveAt = 0;
let lastJobicyAt = 0;
let lastArbeitnowAt = 0;

async function fetchAdzuna(): Promise<LiveJob[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  if (Date.now() - lastAdzunaAt < ADZUNA_COOLDOWN_MS) return [];
  lastAdzunaAt = Date.now();

  const url =
    `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${id}&app_key=${key}` +
    `&results_per_page=50&max_days_old=7&sort_by=date` +
    `&what_or=${encodeURIComponent(
      "developer engineer analyst data software intern internship trainee fresher graduate"
    )}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Adzuna ${res.status}`);
  const data = (await res.json()) as {
    results?: {
      id: string | number;
      title: string;
      description: string;
      redirect_url: string;
      created?: string;
      company?: { display_name?: string };
      location?: { display_name?: string };
    }[];
  };

  return (data.results ?? [])
    .filter((r) => r.redirect_url && r.title)
    .map((r) => {
      const title = stripHtml(r.title);
      const description = stripHtml(r.description).slice(0, 1200);
      return {
        title,
        company: r.company?.display_name?.trim() || "Company",
        location: r.location?.display_name?.trim() || "India",
        description,
        required_skills: extractSkills(`${title} ${description}`),
        role_title: cleanRole(title),
        experience_level: inferLevel(title),
        source_url: r.redirect_url,
        posted_date: toDate(r.created),
      };
    });
}

async function fetchRemotive(): Promise<LiveJob[]> {
  if (Date.now() - lastRemotiveAt < REMOTIVE_COOLDOWN_MS) return [];
  lastRemotiveAt = Date.now();
  const res = await fetch(
    "https://remotive.com/api/remote-jobs?category=software-dev&limit=40",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Remotive ${res.status}`);
  const data = (await res.json()) as {
    jobs?: {
      id: number;
      url: string;
      title: string;
      company_name: string;
      candidate_required_location?: string;
      publication_date?: string;
      description?: string;
      tags?: string[];
    }[];
  };

  return (data.jobs ?? [])
    .filter((j) => j.url && j.title)
    .map((j) => {
      const description = stripHtml(j.description ?? "").slice(0, 1200);
      const tagSkills = (j.tags ?? [])
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8);
      return {
        title: j.title.trim(),
        company: j.company_name?.trim() || "Company",
        location: j.candidate_required_location?.trim()
          ? `Remote (${j.candidate_required_location.trim()})`
          : "Remote",
        description,
        required_skills: tagSkills.length
          ? tagSkills
          : extractSkills(`${j.title} ${description}`),
        role_title: cleanRole(j.title),
        experience_level: inferLevel(j.title),
        source_url: j.url,
        posted_date: toDate(j.publication_date),
      };
    });
}

/**
 * Titles we accept from the general-purpose boards — keeps sales, finance
 * and other non-tech roles out of a board aimed at tech candidates.
 */
const TECH_TITLE_RE =
  /\b(developer|engineer|engineering|programmer|software|frontend|front-end|backend|back-end|full[\s-]?stack|data|devops|sre|cloud|qa|tester|android|ios|mobile|python|java|javascript|typescript|react|angular|node|php|golang|rust|analyst|architect|scientist|machine learning|\bai\b|\bml\b|security|database|sysadmin|it support|technical)\b/i;

/**
 * Jobicy — keyless feed of remote roles, refreshed daily. Our freshest
 * source of quality tech listings, and it carries seniority info.
 */
async function fetchJobicy(): Promise<LiveJob[]> {
  if (Date.now() - lastJobicyAt < JOBICY_COOLDOWN_MS) return [];
  lastJobicyAt = Date.now();

  // industry=dev keeps the feed to engineering roles.
  const res = await fetch(
    "https://jobicy.com/api/v2/remote-jobs?count=50&industry=dev",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Jobicy ${res.status}`);
  const data = (await res.json()) as {
    jobs?: {
      url: string;
      jobTitle: string;
      companyName: string;
      jobGeo?: string;
      jobLevel?: string;
      jobIndustry?: string[];
      jobExcerpt?: string;
      jobDescription?: string;
      pubDate?: string;
    }[];
  };

  const LEVEL_MAP: Record<string, ExperienceLevel> = {
    "entry level": "fresher",
    junior: "junior",
    midweight: "mid",
    "mid level": "mid",
  };

  return (data.jobs ?? [])
    .filter((j) => j.url && j.jobTitle && TECH_TITLE_RE.test(j.jobTitle))
    .map((j) => {
      const description = stripHtml(
        j.jobExcerpt || j.jobDescription || ""
      ).slice(0, 1200);
      const geo = j.jobGeo?.trim();
      const level =
        LEVEL_MAP[(j.jobLevel ?? "").trim().toLowerCase()] ??
        inferLevel(j.jobTitle);
      return {
        title: stripHtml(j.jobTitle).trim(),
        company: j.companyName?.trim() || "Company",
        location: geo && geo.toLowerCase() !== "anywhere"
          ? `Remote (${geo})`
          : "Remote",
        description,
        required_skills: extractSkills(`${j.jobTitle} ${description}`),
        role_title: cleanRole(j.jobTitle),
        experience_level: level,
        source_url: j.url,
        posted_date: toDate(j.pubDate),
      };
    });
}

/**
 * Arbeitnow — keyless, high-volume board updated continuously. Filtered to
 * English-language tech roles so the feed stays relevant.
 */
async function fetchArbeitnow(): Promise<LiveJob[]> {
  if (Date.now() - lastArbeitnowAt < ARBEITNOW_COOLDOWN_MS) return [];
  lastArbeitnowAt = Date.now();

  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);
  const data = (await res.json()) as {
    data?: {
      slug: string;
      url: string;
      title: string;
      company_name: string;
      location?: string;
      description?: string;
      tags?: string[];
      remote?: boolean;
      created_at?: number;
    }[];
  };

  return (data.data ?? [])
    .filter((j) => j.url && j.title && TECH_TITLE_RE.test(j.title))
    .map((j) => {
      const description = stripHtml(j.description ?? "").slice(0, 1200);
      const tagSkills = (j.tags ?? [])
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t && t.length < 24)
        .slice(0, 8);
      return {
        title: stripHtml(j.title).trim(),
        company: j.company_name?.trim() || "Company",
        location: j.remote
          ? `Remote${j.location ? ` (${j.location.trim()})` : ""}`
          : j.location?.trim() || "Not specified",
        description,
        required_skills: tagSkills.length
          ? tagSkills
          : extractSkills(`${j.title} ${description}`),
        role_title: cleanRole(j.title),
        experience_level: inferLevel(j.title),
        source_url: j.url,
        posted_date: j.created_at
          ? new Date(j.created_at * 1000).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      };
    });
}

// ── Sync ─────────────────────────────────────────────────────────────────────

/** source_urls of the fabricated seed jobs from 0001_init.sql. */
const SEED_URLS = [
  "https://www.freshworks.com/company/careers/",
  "https://innovaccer.com/careers",
  "https://careers.swiggy.com/",
  "https://razorpay.com/jobs/",
  "https://www.postman.com/company/careers/",
  "https://careers.cred.club/",
  "https://www.meesho.io/jobs",
  "https://www.phonepe.com/careers/",
  "https://darwinbox.com/careers",
  "https://hasura.io/careers/",
  "https://www.sprinklr.com/careers/",
  "https://www.skyflow.com/company/careers",
  "https://www.highradius.com/careers/",
  "https://www.thoughtspot.com/careers",
  "https://www.chargebee.com/careers/",
  "https://deepintent.com/careers",
  "https://www.gainsight.com/company/careers/",
  "https://www.zoho.com/careers/",
];

export interface SyncResult {
  inserted: number;
  pruned: number;
}

/**
 * Fetch live jobs from all configured providers and insert any listings we
 * don't already have (deduped by source_url). Keeps the feed CURRENT:
 * fabricated seed jobs and listings older than 30 days are removed — except
 * ones a user has saved or applied to, which must survive for their tracker.
 */
export async function syncJobs(
  svc: SupabaseClient
): Promise<SyncResult> {
  const results = await Promise.allSettled([
    fetchAdzuna(),
    fetchJobicy(),
    fetchArbeitnow(),
    fetchRemotive(),
  ]);
  const live = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );
  for (const r of results) {
    if (r.status === "rejected") console.error("Job provider failed:", r.reason);
  }
  if (live.length === 0) return { inserted: 0, pruned: 0 };

  const { data: existing } = await svc.from("jobs").select("source_url");
  const have = new Set(
    (existing ?? []).map((x: { source_url: string | null }) => x.source_url)
  );

  // Dedupe within the batch and against the table.
  const seen = new Set<string>();
  const fresh = live.filter((j) => {
    if (have.has(j.source_url) || seen.has(j.source_url)) return false;
    seen.add(j.source_url);
    return true;
  });

  let inserted = 0;
  if (fresh.length > 0) {
    const { error } = await svc.from("jobs").insert(fresh);
    if (error) {
      console.error("Jobs insert failed:", error);
    } else {
      inserted = fresh.length;
    }
  }

  // Prune seed jobs once real listings are in the table.
  let pruned = 0;
  const hasLiveData =
    inserted > 0 ||
    (existing ?? []).some(
      (x: { source_url: string | null }) =>
        x.source_url && !SEED_URLS.includes(x.source_url)
    );
  if (hasLiveData) {
    const { data: seedRows } = await svc
      .from("jobs")
      .select("id, source_url")
      .in("source_url", SEED_URLS);
    if (seedRows?.length) {
      const { data: apps } = await svc.from("applications").select("job_id");
      const usedIds = new Set(
        (apps ?? []).map((a: { job_id: string }) => a.job_id)
      );
      const deletable = seedRows
        .filter((r: { id: string }) => !usedIds.has(r.id))
        .map((r: { id: string }) => r.id);
      if (deletable.length > 0) {
        const { error } = await svc.from("jobs").delete().in("id", deletable);
        if (!error) pruned = deletable.length;
      }
    }
  }

  // Purge stale listings (14+ days old) that nobody is tracking, so the
  // board only ever shows openings that are still worth applying to.
  const cutoff = new Date(Date.now() - 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data: staleRows } = await svc
    .from("jobs")
    .select("id")
    .lt("posted_date", cutoff);
  if (staleRows?.length) {
    const { data: apps } = await svc.from("applications").select("job_id");
    const usedIds = new Set(
      (apps ?? []).map((a: { job_id: string }) => a.job_id)
    );
    const stale = staleRows
      .filter((r: { id: string }) => !usedIds.has(r.id))
      .map((r: { id: string }) => r.id);
    if (stale.length > 0) {
      const { error } = await svc.from("jobs").delete().in("id", stale);
      if (!error) pruned += stale.length;
    }
  }

  return { inserted, pruned };
}
