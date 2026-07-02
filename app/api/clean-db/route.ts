import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { cleanParsedResume, repairInterleavedText } from "@/lib/resume-format";
import type { Resume, ParsedResume } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceClient();

  // 1. Fetch all resumes from the database using service client
  const { data: resumes, error: fetchError } = await supabase
    .from("resumes")
    .select("id, parsed_json, ats_text");

  if (fetchError) {
    return NextResponse.json({ error: "Fetch failed", details: fetchError }, { status: 500 });
  }

  if (!resumes || resumes.length === 0) {
    return NextResponse.json({ message: "No resumes found in database" });
  }

  const updatedResumes = [];
  const errors = [];

  // 2. Clean and update each resume in the database
  for (const r of resumes) {
    let cleanedParsed = null;
    if (r.parsed_json) {
      cleanedParsed = cleanParsedResume(r.parsed_json as ParsedResume);
    }
    const cleanedAtsText = r.ats_text ? repairInterleavedText(r.ats_text) : null;

    const { error: updateError } = await supabase
      .from("resumes")
      .update({
        parsed_json: cleanedParsed,
        ats_text: cleanedAtsText,
      })
      .eq("id", r.id);

    if (updateError) {
      errors.push({ id: r.id, error: updateError });
    } else {
      updatedResumes.push({ id: r.id });
    }
  }

  return NextResponse.json({
    message: "Database cleanup run completed.",
    total: resumes.length,
    successCount: updatedResumes.length,
    errorCount: errors.length,
    errors: errors,
  });
}
