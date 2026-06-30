import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getMatchedJobs } from "@/lib/matching";
import { getSkillGaps } from "@/lib/resources";
import type {
  Application,
  ApplicationStatus,
  Job,
  MatchedJob,
  ParsedResume,
  Resume,
  SkillGap,
} from "@/lib/types";

export async function getActiveResume(): Promise<Resume | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Resume) ?? null;
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("applications")
    .select("*, job:jobs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data as Application[]) ?? [];
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
