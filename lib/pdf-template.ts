// Client-only: renders a ParsedResume into a professionally formatted PDF
// matching the on-screen resume template — centered serif header, ruled
// UPPERCASE section headings, right-aligned dates, two-column skills.
import type { ParsedResume } from "@/lib/types";
import {
  cleanParsedResume,
  formatSkill,
  groupSkills,
} from "@/lib/resume-format";

/** "05/2025 – 07/2025 | Hyderabad, India" → ["05/2025 – 07/2025", "Hyderabad, India"] */
export function splitDuration(d: string): [string, string] {
  const [date = "", loc = ""] = (d ?? "").split("|").map((s) => s.trim());
  return [date, loc];
}

export function displayUrl(u: string): string {
  if (!u) return "";
  return u
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/\/+$/, "")
    .replace(/\s*\|\s*$/, "")
    .trim();
}

export async function downloadTemplatePdf(
  rawParsed: ParsedResume,
  filename: string
) {
  // Final gate: no matter which data path produced this object, repair any
  // glyph-interleaving artifacts so they can never reach a downloaded PDF.
  const parsed = cleanParsedResume(rawParsed);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  const CW = W - M * 2;
  let y = 50;

  const ensure = (needed: number) => {
    if (y + needed > H - 45) {
      doc.addPage();
      y = 50;
    }
  };
  const font = (
    style: "normal" | "bold" | "italic" | "bolditalic",
    size: number
  ) => {
    doc.setFont("times", style);
    doc.setFontSize(size);
  };

  // ── Header ────────────────────────────────────────────────────────────────
  font("bold", 24);
  doc.text(parsed.name?.trim() || parsed.role_title || "Resume", W / 2, y, {
    align: "center",
  });
  y += 20;
  if (parsed.name?.trim() && parsed.role_title) {
    font("italic", 13);
    doc.text(parsed.role_title, W / 2, y, { align: "center" });
    y += 17;
  }
  const contact = [
    parsed.location,
    parsed.email,
    parsed.phone,
    ...(parsed.links ?? []).map(displayUrl),
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join("   |   ");
  if (contact) {
    font("normal", 10);
    const wrapped: string[] = doc.splitTextToSize(contact, CW);
    for (const line of wrapped) {
      doc.text(line, W / 2, y, { align: "center" });
      y += 13;
    }
  }
  y += 6;

  const heading = (label: string) => {
    ensure(38);
    y += 8;
    font("bold", 12.5);
    doc.text(label.toUpperCase(), M, y);
    doc.setDrawColor(40);
    doc.setLineWidth(1.4);
    doc.line(M, y + 4, W - M, y + 4);
    y += 18;
  };

  const bullet = (text: string) => {
    font("normal", 10.5);
    const wrapped: string[] = doc.splitTextToSize(text, CW - 14);
    wrapped.forEach((piece, i) => {
      ensure(13);
      if (i === 0) doc.text("•", M + 2, y);
      doc.text(piece, M + 14, y);
      y += 12.5;
    });
  };

  const paragraph = (text: string) => {
    font("normal", 10.5);
    const wrapped: string[] = doc.splitTextToSize(text, CW);
    for (const piece of wrapped) {
      ensure(13);
      doc.text(piece, M, y);
      y += 12.5;
    }
  };

  // ── Summary ──────────────────────────────────────────────────────────────
  if (parsed.summary?.trim()) {
    heading("Summary");
    paragraph(parsed.summary.trim());
  }

  // ── Experience ───────────────────────────────────────────────────────────
  if (parsed.experience.length) {
    heading("Professional Experience");
    for (const e of parsed.experience) {
      ensure(38);
      const [date, loc] = splitDuration(e.duration);
      font("bold", 11.5);
      doc.text(e.title || "Role", M, y);
      if (date) {
        font("normal", 10.5);
        doc.text(date, W - M, y, { align: "right" });
      }
      y += 12.5;
      if (e.company || loc) {
        if (e.company) {
          font("italic", 10.5);
          doc.text(e.company, M, y);
        }
        if (loc) {
          font("normal", 10.5);
          doc.text(loc, W - M, y, { align: "right" });
        }
        y += 12.5;
      }
      for (const h of e.highlights) bullet(h);
      y += 4;
    }
  }

  // ── Projects ─────────────────────────────────────────────────────────────
  if (parsed.projects?.length) {
    heading("Projects");
    for (const pr of parsed.projects) {
      ensure(28);
      font("bold", 11.5);
      doc.text(pr.name || "Project", M, y);
      y += 12.5;
      if (pr.tech?.length) {
        font("italic", 10);
        const techLine: string[] = doc.splitTextToSize(
          pr.tech.map(formatSkill).join(", "),
          CW
        );
        for (const piece of techLine) {
          ensure(12);
          doc.text(piece, M, y);
          y += 11.5;
        }
      }
      if (pr.description) bullet(pr.description);
      y += 4;
    }
  }

  // ── Education ────────────────────────────────────────────────────────────
  if (parsed.education.length) {
    heading("Education");
    for (const e of parsed.education) {
      ensure(26);
      font("bold", 11.5);
      doc.text(e.degree || "Qualification", M, y);
      if (e.year) {
        font("normal", 10.5);
        doc.text(e.year, W - M, y, { align: "right" });
      }
      y += 12.5;
      if (e.institution) {
        font("italic", 10.5);
        doc.text(e.institution, M, y);
        y += 12.5;
      }
      y += 2;
    }
  }

  // ── Skills (short categorized rows) ──────────────────────────────────────
  if (parsed.skills.length) {
    heading("Skills");
    for (const g of groupSkills(parsed.skills)) {
      font("bold", 10.5);
      const label = `${g.label}: `;
      const labelW = doc.getTextWidth(label);
      const wrapped: string[] = doc.splitTextToSize(
        g.skills.join(", "),
        CW - labelW
      );
      wrapped.forEach((piece, i) => {
        ensure(13);
        if (i === 0) {
          font("bold", 10.5);
          doc.text(label, M, y);
        }
        font("normal", 10.5);
        doc.text(piece, M + labelW, y);
        y += 12.5;
      });
      y += 1;
    }
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  doc.save(`${safe}.pdf`);
}
