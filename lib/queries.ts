import "server-only";
import { createClient, getUser } from "@/lib/supabase/server";
import { getMatchedJobs } from "@/lib/matching";
import { getSkillGaps } from "@/lib/resources";
import { cleanParsedResume, repairInterleavedText } from "@/lib/resume-format";
import type {
  Application,
  ApplicationStatus,
  BrowsableJob,
  Job,
  MatchedJob,
  ParsedResume,
  Resume,
  SkillGap,
} from "@/lib/types";

export async function getActiveResume(): Promise<Resume | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = createClient();

  const { data } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  // Repair legacy glyph-interleaving artifacts ("&D&e&s&i&g&n&e&d&") and,
  // when anything actually changed, persist the cleaned data back so the
  // stored row is permanently healed (PDF downloads, AI actions, and any
  // older deployment all read the same row).
  const resume = data as Resume;
  const patch: { parsed_json?: ParsedResume; ats_text?: string } = {};
  if (resume.parsed_json) {
    const cleaned = cleanParsedResume(resume.parsed_json as ParsedResume);
    if (JSON.stringify(cleaned) !== JSON.stringify(resume.parsed_json)) {
      patch.parsed_json = cleaned;
    }
    resume.parsed_json = cleaned;
  }
  if (resume.ats_text) {
    const cleaned = repairInterleavedText(resume.ats_text);
    if (cleaned !== resume.ats_text) patch.ats_text = cleaned;
    resume.ats_text = cleaned;
  }
  if (Object.keys(patch).length > 0) {
    await supabase
      .from("resumes")
      .update(patch)
      .eq("id", resume.id)
      .eq("user_id", user.id);
  }

  return resume;
}

export async function getAllJobs(): Promise<Job[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .order("posted_date", { ascending: false });
  return (data as Job[]) ?? [];
}

export async function getUserApplications(): Promise<Application[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = createClient();

  const { data } = await supabase
    .from("applications")
    .select("*, job:jobs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data as Application[]) ?? [];
}

export interface BrowseJobsData {
  /** Every job, scored against the active resume when one exists. */
  jobs: BrowsableJob[];
  hasResume: boolean;
  statusByJobId: Record<string, ApplicationStatus>;
}

export async function getBrowseJobsData(): Promise<BrowseJobsData> {
  const [resume, jobs, applications] = await Promise.all([
    getActiveResume(),
    getAllJobs(),
    getUserApplications(),
  ]);

  const statusByJobId: Record<string, ApplicationStatus> = {};
  for (const app of applications) {
    statusByJobId[app.job_id] = app.status;
  }

  const hasResume = Boolean(resume?.parsed_json);
  const browsable: BrowsableJob[] = hasResume
    ? getMatchedJobs(resume!.parsed_json as ParsedResume, jobs, jobs.length)
    : jobs.map((job) => ({ ...job, missingSkills: job.required_skills }));

  return { jobs: browsable, hasResume, statusByJobId };
}

export interface DashboardData {
  resume: Resume | null;
  matches: MatchedJob[];
  skillGaps: SkillGap[];
  applications: Application[];
  statusByJobId: Record<string, ApplicationStatus>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [resume, jobs, applications] = await Promise.all([
    getActiveResume(),
    getAllJobs(),
    getUserApplications(),
  ]);

  const statusByJobId: Record<string, ApplicationStatus> = {};
  for (const app of applications) {
    statusByJobId[app.job_id] = app.status;
  }

  let matches: MatchedJob[] = [];
  let skillGaps: SkillGap[] = [];

  if (resume?.parsed_json) {
    matches = getMatchedJobs(resume.parsed_json as ParsedResume, jobs, 20);
    skillGaps = getSkillGaps(matches, 3);
  }

  return { resume, matches, skillGaps, applications, statusByJobId };
}
