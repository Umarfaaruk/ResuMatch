"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin";

export interface AdminIssue {
  id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  admin_reply: string | null;
  created_at: string;
  user_email: string;
  user_name: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  resumes: number;
  applications: number;
  open_issues: number;
}

export interface AdminData {
  stats: {
    users: number;
    resumes: number;
    applications: number;
    jobs: number;
    openIssues: number;
  };
  users: AdminUserRow[];
  issues: AdminIssue[];
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Everything the admin panel shows, in one call. Admin-only. */
export async function getAdminData(): Promise<Result<AdminData>> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Not authorized." };

  const svc = createServiceClient();

  const [authUsers, resumesRes, appsRes, jobsRes, issuesRes, profilesRes] =
    await Promise.all([
      svc.auth.admin.listUsers({ page: 1, perPage: 500 }),
      svc.from("resumes").select("user_id"),
      svc.from("applications").select("user_id"),
      svc.from("jobs").select("id", { count: "exact", head: true }),
      svc
        .from("issues")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      svc.from("profiles").select("id, full_name"),
    ]);

  if (authUsers.error) {
    console.error("admin listUsers failed:", authUsers.error);
    return { ok: false, error: "Couldn't load users (check service key)." };
  }

  const nameById = new Map(
    (profilesRes.data ?? []).map((p: { id: string; full_name: string | null }) => [
      p.id,
      p.full_name ?? "",
    ])
  );
  const count = (rows: { user_id: string }[] | null, id: string) =>
    (rows ?? []).filter((r) => r.user_id === id).length;

  const issues = (issuesRes.data ?? []) as (Omit<
    AdminIssue,
    "user_email" | "user_name"
  > & { user_id: string })[];

  const emailById = new Map(
    authUsers.data.users.map((u) => [u.id, u.email ?? ""])
  );

  const users: AdminUserRow[] = authUsers.data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: nameById.get(u.id) || "—",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      resumes: count(resumesRes.data, u.id),
      applications: count(appsRes.data, u.id),
      open_issues: issues.filter(
        (i) => i.user_id === u.id && i.status !== "resolved"
      ).length,
    }))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  return {
    ok: true,
    data: {
      stats: {
        users: users.length,
        resumes: (resumesRes.data ?? []).length,
        applications: (appsRes.data ?? []).length,
        jobs: jobsRes.count ?? 0,
        openIssues: issues.filter((i) => i.status !== "resolved").length,
      },
      users,
      issues: issues.map((i) => ({
        id: i.id,
        subject: i.subject,
        message: i.message,
        status: i.status,
        admin_reply: i.admin_reply,
        created_at: i.created_at,
        user_email: emailById.get(i.user_id) ?? "unknown",
        user_name: nameById.get(i.user_id) || "—",
      })),
    },
  };
}

/** Reply to an issue and/or move its status. Admin-only. */
export async function updateIssue(
  issueId: string,
  status: "open" | "in_progress" | "resolved",
  reply: string
): Promise<Result<null>> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Not authorized." };
  if (!["open", "in_progress", "resolved"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const svc = createServiceClient();
  const { error } = await svc
    .from("issues")
    .update({
      status,
      admin_reply: reply.trim().slice(0, 3000) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", issueId);

  if (error) {
    console.error("updateIssue failed:", error);
    return { ok: false, error: "Couldn't update the issue." };
  }
  revalidatePath("/admin");
  return { ok: true, data: null };
}
