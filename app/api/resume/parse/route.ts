import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractResumeText, extractContactHints } from "@/lib/extract";
import { parseResumeText } from "@/lib/groq";
import { buildAtsText, buildHumanizedText } from "@/lib/resume-format";

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

  // Only resume document types are parseable.
  if (!/\.(pdf|docx?)$/i.test(fileName)) {
    return NextResponse.json(
      { error: "Please upload a PDF or DOCX file." },
      { status: 415 }
    );
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

  // Match the client-side 5 MB limit server-side (small headroom).
  if (buffer.length > 6 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File is too large — please upload a file under 5 MB." },
      { status: 413 }
    );
  }

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
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("GROQ_API_KEY")) {
      return NextResponse.json(
        {
          error:
            "AI parsing needs a Groq API key. Add GROQ_API_KEY to your environment (.env.local locally, or Vercel env vars) and try again.",
        },
        { status: 503 }
      );
    }
    if (/rate.?limit|too large|413|429/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "The free AI tier is briefly rate-limited. Wait a minute and try again.",
        },
        { status: 429 }
      );
    }
    if (/401|invalid.*api.*key|unauthor/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Your Groq API key looks invalid. Double-check GROQ_API_KEY and try again.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "The AI parser is unavailable right now. Please try again." },
      { status: 502 }
    );
  }

  // 2b) Guarantee personal details: backfill contact from regex over the raw
  // text (more reliable than the LLM for name/email/phone/links).
  const hints = extractContactHints(rawText);
  const p = result.parsed;
  p.name = p.name || hints.name;
  p.email = p.email || hints.email;
  p.phone = p.phone || hints.phone;
  // Prefer regex-extracted links: they are full URLs, while the model
  // sometimes returns bare usernames.
  const modelLinksAreUrls = (p.links ?? []).some((l) => l.includes("."));
  if (hints.links.length > 0 && !modelLinksAreUrls) p.links = hints.links;
  else if (!p.links || p.links.length === 0) p.links = hints.links;

  // Re-render both versions now that the contact details are complete — the
  // deterministic builders always include the full contact header.
  const atsText = buildAtsText(p);
  p.humanized_text = buildHumanizedText(p);

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
      parsed_json: p,
      ats_text: atsText,
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
