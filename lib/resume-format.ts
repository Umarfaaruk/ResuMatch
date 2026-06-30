import type { ParsedResume } from "./types";

// Deterministic, dependency-free resume builders. These run as a guaranteed
// fallback when the AI omits/empties the long-form text fields, so the UI
// never shows an empty resume. They use only the structured parsed data.

function contactLine(p: ParsedResume): string {
  const parts = [p.email, p.phone, p.location, ...(p.links ?? [])]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.join(" | ");
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Plain, single-column, ATS-safe text. UPPERCASE headings, "- " bullets. */
export function buildAtsText(p: ParsedResume): string {
  const lines: string[] = [];

  if (p.name) lines.push(p.name.trim());
  const contact = contactLine(p);
  if (contact) lines.push(contact);
  if (p.name || contact) lines.push("");

  if (p.summary) {
    lines.push("SUMMARY", p.summary.trim(), "");
  }

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
      const header = pr.tech?.length
        ? `${pr.name} (${pr.tech.join(", ")})`
        : pr.name;
      if (header) lines.push(header);
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

/** Warmer, narrative version that reads like a person wrote it. */
export function buildHumanizedText(p: ParsedResume): string {
  const lines: string[] = [];

  if (p.name) lines.push(p.name.trim());
  const contact = contactLine(p);
  if (contact) lines.push(contact);
  if (p.name || contact) lines.push("");

  const role = p.role_title || "professional";
  const summary =
    p.summary?.trim() ||
    `Motivated ${role.toLowerCase()} with hands-on experience and a strong foundation in ${p.skills
      .slice(0, 4)
      .join(", ")}. Eager to contribute to impactful teams and keep growing.`;
  lines.push("PROFILE", summary, "");

  if (p.experience.length) {
    lines.push("WHERE I'VE WORKED");
    for (const e of p.experience) {
      const header = [e.title, e.company].filter(Boolean).join(" at ");
      const withDur = e.duration ? `${header} (${e.duration})` : header;
      if (withDur) lines.push(withDur);
      for (const h of e.highlights) lines.push(`• ${h}`);
      lines.push("");
    }
  }

  if (p.projects?.length) {
    lines.push("THINGS I'VE BUILT");
    for (const pr of p.projects) {
      lines.push(pr.tech?.length ? `${pr.name} — ${pr.tech.join(", ")}` : pr.name);
      if (pr.description) lines.push(`• ${pr.description}`);
      lines.push("");
    }
  }

  if (p.skills.length) {
    lines.push("WHAT I WORK WITH", p.skills.map(titleCase).join(" · "), "");
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
