// Server-only resume text extraction. Uses pdf-parse (v2 class API) for PDFs
// and mammoth for DOCX. Keep this out of client bundles.
import "server-only";

export type SupportedMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/msword";

export function isSupportedType(mime: string, filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    mime === "application/pdf" ||
    lower.endsWith(".pdf") ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx") ||
    mime === "application/msword" ||
    lower.endsWith(".doc")
  );
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  // Preload the pdf.js worker. Harmless when not required, but helps in some
  // bundled serverless runtimes. Non-fatal if the subpath is unavailable.
  try {
    await import("pdf-parse/worker");
  } catch {
    /* optional */
  }
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

export interface ContactHints {
  name?: string;
  email?: string;
  phone?: string;
  links: string[];
}

/**
 * Deterministically pull contact details out of raw resume text with regexes.
 * Far more reliable than an LLM for email/phone, so we use this to guarantee
 * (or backfill) the personal details in the generated resume.
 */
export function extractContactHints(raw: string): ContactHints {
  const email = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+\w/)?.[0];

  const phone = (
    raw.match(/\+91[\s-]?\d{5}[\s-]?\d{5}/) ||
    raw.match(/\b[6-9]\d{9}\b/) ||
    raw.match(/\+\d[\d\s().-]{8,15}\d/) ||
    raw.match(/\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/)
  )?.[0]?.replace(/\s{2,}/g, " ").trim();

  const links = Array.from(
    new Set(
      Array.from(
        raw.matchAll(
          /\b(?:https?:\/\/)?(?:www\.)?(?:github\.com|linkedin\.com|gitlab\.com|behance\.net|[a-z0-9-]+\.(?:dev|io|me|app))\/[^\s)|,]+/gi
        )
      ).map((m) => m[0].replace(/[.,;]+$/, ""))
    )
  ).slice(0, 4);

  // Name: first plausible line (2–4 alphabetic words, no digits/@) near the top.
  let name: string | undefined;
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6);
  for (const l of lines) {
    if (l.includes("@") || /\d/.test(l)) continue;
    const words = l.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      l.length <= 40 &&
      /^[A-Za-z][A-Za-z.'\s-]+$/.test(l)
    ) {
      name = l.replace(/\s+/g, " ");
      break;
    }
  }

  return { name, email, phone, links };
}

/** Extract raw text from a resume file buffer based on its name/mime. */
export async function extractResumeText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();
  let text = "";

  if (lower.endsWith(".pdf")) {
    text = await extractPdf(buffer);
  } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    text = await extractDocx(buffer);
  } else {
    // Fallback: try PDF first, then DOCX.
    try {
      text = await extractPdf(buffer);
    } catch {
      text = await extractDocx(buffer);
    }
  }

  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
