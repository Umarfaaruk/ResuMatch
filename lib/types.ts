// Shared domain types for ResuMatch.
// These mirror the Supabase schema in supabase/migrations.

export type ExperienceLevel = "fresher" | "junior" | "mid";

export type ApplicationStatus = "saved" | "applied" | "interview" | "rejected";

export interface Profile {
  id: string;
  full_name: string | null;
  target_role: string | null;
  location: string | null;
  created_at: string;
}

/** Structured resume content returned by the Groq parser. */
export interface ParsedResume {
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  role_title: string;
  experience_level: ExperienceLevel;
}

export interface ResumeExperience {
  title: string;
  company: string;
  duration: string;
  highlights: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  year: string;
}

export interface Resume {
  id: string;
  user_id: string;
  original_file_path: string;
  parsed_json: ParsedResume | null;
  ats_text: string | null;
  created_at: string;
  is_active: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: string[];
  role_title: string;
  experience_level: ExperienceLevel;
  source_url: string | null;
  posted_date: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_date: string | null;
  notes: string | null;
  // Populated when joined with jobs in queries.
  job?: Job;
}

/** A job enriched with match scoring, produced client/server-side (no AI). */
export interface MatchedJob extends Job {
  matchScore: number; // 0–100
  matchedSkills: string[];
  missingSkills: string[];
}

export interface SkillGap {
  skill: string;
  resourceName: string;
  resourceUrl: string;
}
