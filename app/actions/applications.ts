"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/types";

const VALID: ApplicationStatus[] = ["saved", "applied", "interview", "rejected"];

interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Create or update the current user's application for a job.
 * Sets applied_date when moving into the "applied" state for the first time.
 */
export async function upsertApplication(
  jobId: string,
  status: ApplicationStatus
): Promise<ActionResult> {
  if (!VALID.includes(status)) {
    return { ok: false, error: "Invalid status" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const appliedDate =
    status === "applied" || status === "interview"
      ? new Date().toISOString()
      : null;

  const { error } = await supabase.from("applications").upsert(
    {
      user_id: user.id,
      job_id: jobId,
      status,
      applied_date: appliedDate,
    },
    { onConflict: "user_id,job_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Change the status of an existing application by its id. */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<ActionResult> {
  if (!VALID.includes(status)) {
    return { ok: false, error: "Invalid status" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const patch: Record<string, unknown> = { status };
  if (status === "applied" || status === "interview") {
    patch.applied_date = new Date().toISOString();
  }

  const { error } = await supabase
    .from("applications")
    .update(patch)
    .eq("id", applicationId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Remove an application from the tracker. */
export async function deleteApplication(
  applicationId: string
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", applicationId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}
