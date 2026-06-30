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
