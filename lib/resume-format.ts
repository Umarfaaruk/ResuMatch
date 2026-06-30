import type { ParsedResume } from "./types";

// Deterministic, dependency-free resume builders. These run as a guaranteed
// fallback when the AI omits/empties the long-form text fields, so the UI
// never shows an empty resume. Both produce a COMPLETE, submission-ready
// resume with a contact header and standard sections — the only difference is
// styling (the ATS view renders serif/plain; the Professional view renders
// modern sans-serif with the same content).

function contactLine(p: ParsedResume): string {
  const parts = [p.email, p.phone, p.location, ...(p.links ?? [])]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.join("  |  ");
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function header(p: ParsedResume, lines: string[]) {
  // Name (falls back to the target role so the document never starts headless).
  const hasName = !!(p.name && p.name.trim());
  lines.push(hasName ? p.name!.trim() : titleCase(p.role_title || "Your Name"));
  const contact = contactLine(p);
  if (contact) lines.push(contact);
  // Show the role as a subtitle only when we have a real name (avoids dupes).
  if (hasName && p.role_title) lines.push(p.role_title);
  lines.push("");
}

function fallbackSummary(p: ParsedResume): string {
  const role = (p.role_title || "professional").toLowerCase();
  const top = p.skills.slice(0, 5).join(", ");
  const lvl =
    p.experience_level === "fresher"
      ? "an enthusiastic entry-level"
      : p.experience_level === "junior"
        ? "a junior"
        : "an experienced";
  return `${titleCase(lvl)} ${role}${
    top ? ` skilled in ${top}` : ""
  }. Quick learner focused on building reliable software and delivering measurable results.`;
}

/** Plain, single-column, ATS-safe text. UPPERCASE headings, "- " bullets. */
export function buildAtsText(p: ParsedResume): string {
  const lines: string[] = [];
  header(p, lines);

  lines.push("SUMMARY", (p.summary?.trim() || fallbackSummary(p)), "");

  if (p.skills.length) {
    lines.push("SKILLS", p.skills.map(titleCase).join(", "), "");
  }

  if (p.experience.length) {
    lines.push("EXPERIENCE");
    for (const e of p.experience) {
      const header = [e.title, e.company].filter(Boolean).join(" — ");
      if (header) lines.push(header);
      if (e.duration) lines.push(e.duration);
      for (const h of e.highlights) lines.push(`- ${h}`);
      lines.push("");
    }
  }

  if (p.projects?.length) {
    lines.push("PROJECTS");
    for (const pr of p.projects) {
      const head = pr.tech?.length
        ? `${pr.name} (${pr.tech.join(", ")})`
        : pr.name;
      if (head) lines.push(head);
      if (pr.description) lines.push(`- ${pr.description}`);
      lines.push("");
    }
  }

  if (p.education.length) {
    lines.push("EDUCATION");
    for (const e of p.education) {
      const parts = [e.degree, e.institution].filter(Boolean).join(" — ");
      const withYear = e.year ? `${parts} (${e.year})` : parts;
      if (withYear) lines.push(withYear);
    }
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Professional, complete resume — same content, recruiter-friendly headings. */
export function buildHumanizedText(p: ParsedResume): string {
  const lines: string[] = [];
  header(p, lines);

  lines.push(
    "PROFESSIONAL SUMMARY",
    p.summary?.trim() || fallbackSummary(p),
    ""
  );

  if (p.skills.length) {
    lines.push("TECHNICAL SKILLS", p.skills.map(titleCase).join("  •  "), "");
  }

  if (p.experience.length) {
    lines.push("PROFESSIONAL EXPERIENCE");
    for (const e of p.experience) {
      const head = [e.title, e.company].filter(Boolean).join("  |  ");
      if (head) lines.push(head);
      if (e.duration) lines.push(e.duration);
      for (const h of e.highlights) lines.push(`• ${h}`);
      lines.push("");
    }
  }

  if (p.projects?.length) {
    lines.push("PROJECTS");
    for (const pr of p.projects) {
      lines.push(
        pr.tech?.length ? `${pr.name}  |  ${pr.tech.join(", ")}` : pr.name
      );
      if (pr.description) lines.push(`• ${pr.description}`);
      lines.push("");
    }
  }

  if (p.education.length) {
    lines.push("EDUCATION");
    for (const e of p.education) {
      const parts = [e.degree, e.institution].filter(Boolean).join(", ");
      const withYear = e.year ? `${parts} (${e.year})` : parts;
      if (withYear) lines.push(withYear);
    }
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
