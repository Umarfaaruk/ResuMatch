"use server";

import { createClient, getUser } from "@/lib/supabase/server";

export interface Issue {
  id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  admin_reply: string | null;
  created_at: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** User raises a support issue from anywhere in the app. */
export async function raiseIssue(
  subject: string,
  message: string
): Promise<Result<null>> {
  const cleanSubject = subject.trim().slice(0, 150);
  const cleanMessage = message.trim().slice(0, 3000);
  if (cleanSubject.length < 3 || cleanMessage.length < 10) {
    return {
      ok: false,
      error: "Add a short subject and describe the problem in a few words.",
    };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const supabase = createClient();
  const { error } = await supabase.from("issues").insert({
    user_id: user.id,
    subject: cleanSubject,
    message: cleanMessage,
  });
  if (error) {
    console.error("raiseIssue failed:", error);
    return { ok: false, error: "Couldn't submit right now — try again." };
  }
  return { ok: true, data: null };
}

/** The user's own issues, newest first (shows admin replies + status). */
export async function myIssues(): Promise<Result<Issue[]>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("issues")
    .select("id, subject, message, status, admin_reply, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { ok: false, error: "Couldn't load your issues." };
  return { ok: true, data: (data ?? []) as Issue[] };
}
