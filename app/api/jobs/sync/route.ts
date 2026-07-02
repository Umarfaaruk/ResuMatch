import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { syncJobs } from "@/lib/jobs-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

// Per-instance cooldown so the providers are hit at most once a minute no
// matter how many browsers are polling.
let lastSyncAt = 0;
let inFlight: Promise<{ inserted: number; pruned: number }> | null = null;
let warnedBadKey = false;

/**
 * Sanity-check the configured key: pasting the anon key here is a common
 * mistake and every insert would fail RLS. Legacy keys are JWTs with a role
 * claim; new-style secret keys start with "sb_secret_".
 */
function serviceKeyLooksValid(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) return false;
  const parts = key.split(".");
  if (parts.length !== 3) return true; // sb_secret_* or other non-JWT secret
  try {
    const role = JSON.parse(Buffer.from(parts[1], "base64").toString()).role;
    return role === "service_role";
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  // Auth: any logged-in user may trigger a sync; external schedulers (e.g.
  // a cron service) can call with the CRON_SECRET header instead.
  const cronSecret = request.headers.get("x-cron-secret");
  const isCron =
    !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;
  if (!isCron) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
  }

  if (!serviceKeyLooksValid()) {
    if (!warnedBadKey) {
      warnedBadKey = true;
      console.warn(
        "Jobs sync disabled: SUPABASE_SERVICE_ROLE_KEY is missing or set to the anon key. Copy the service_role secret from Supabase → Project Settings → API keys and restart."
      );
    }
    return NextResponse.json({ changed: false, reason: "not_configured" });
  }

  const force =
    isCron && new URL(request.url).searchParams.get("force") === "1";
  if (!force && Date.now() - lastSyncAt < 60_000) {
    return NextResponse.json({ changed: false, reason: "fresh" });
  }

  try {
    // Coalesce concurrent callers onto one provider round-trip.
    if (!inFlight) {
      lastSyncAt = Date.now();
      inFlight = syncJobs(createServiceClient()).finally(() => {
        inFlight = null;
      });
    }
    const { inserted, pruned } = await inFlight;
    return NextResponse.json({
      changed: inserted > 0 || pruned > 0,
      inserted,
      pruned,
    });
  } catch (err) {
    console.error("Jobs sync failed:", err);
    return NextResponse.json(
      { changed: false, reason: "error" },
      { status: 502 }
    );
  }
}
