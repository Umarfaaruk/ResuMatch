import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractResumeText } from "@/lib/extract";
import { parseResumeText } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { filePath?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { filePath, fileName } = body;
  if (!filePath || !fileName) {
    return NextResponse.json(
      { error: "filePath and fileName are required" },
      { status: 400 }
    );
  }

  // Security: the stored path must live under the user's own folder.
  if (!filePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
  }

  // Download the uploaded file (RLS restricts this to the owner).
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(filePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: "Could not read the uploaded file." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  // 1) Extract raw text.
  let rawText: string;
  try {
    rawText = await extractResumeText(buffer, fileName);
  } catch (err) {
    console.error("Extraction failed:", err);
    return NextResponse.json(
      { error: "We couldn't read text from that file. Try a different export." },
      { status: 422 }
    );
  }

  if (rawText.trim().length < 30) {
    return NextResponse.json(
      {
        error:
          "This file has too little text to parse. If it's a scanned image, please upload a text-based PDF or DOCX.",
      },
      { status: 422 }
    );
  }

  // 2) Parse + rewrite with Groq.
  let result;
  try {
    result = await parseResumeText(rawText);
  } catch (err) {
    console.error("Groq parse failed:", err);
    return NextResponse.json(
      { error: "The AI parser is unavailable right now. Please try again." },
      { status: 502 }
    );
  }

  // 3) Save: deactivate previous resumes, insert the new active one.
  await supabase
    .from("resumes")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { data: inserted, error: insertError } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      original_file_path: filePath,
      parsed_json: result.parsed,
      ats_text: result.ats_text,
      is_active: true,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Insert failed:", insertError);
    return NextResponse.json(
      { error: "Failed to save the parsed resume." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: inserted.id, ok: true });
}
