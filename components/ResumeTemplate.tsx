"use client";

import { MapPin, Mail, Phone, Link2 } from "lucide-react";
import { formatSkill, groupSkills } from "@/lib/resume-format";
import { splitDuration, displayUrl } from "@/lib/pdf-template";
import type { ParsedResume } from "@/lib/types";

/**
 * On-screen render of the professional resume template: centered serif
 * header, ruled UPPERCASE section headings, right-aligned dates, and
 * two-column skills. Mirrors the layout produced by downloadTemplatePdf.
 */
export function ResumeTemplate({ parsed }: { parsed: ParsedResume }) {
  const contact = [
    parsed.location && { icon: MapPin, text: parsed.location },
    parsed.email && { icon: Mail, text: parsed.email },
    parsed.phone && { icon: Phone, text: parsed.phone },
    ...(parsed.links ?? []).map((l) => ({ icon: Link2, text: displayUrl(l) })),
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];

  const skillGroups = groupSkills(parsed.skills);

  return (
    <div className="mx-auto max-w-[680px] bg-white px-8 py-10 font-serif text-[13px] leading-relaxed text-neutral-800">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-[28px] font-bold leading-tight text-neutral-900">
          {parsed.name?.trim() || parsed.role_title || "Your Name"}
        </h1>
        {parsed.name?.trim() && parsed.role_title && (
          <p className="mt-0.5 text-[15px] italic text-neutral-700">
            {parsed.role_title}
          </p>
        )}
        {contact.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-neutral-700">
            {contact.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <c.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {c.text}
              </span>
            ))}
          </div>
        )}
      </header>

      {parsed.summary?.trim() && (
        <Section title="Summary">
          <p>{parsed.summary.trim()}</p>
        </Section>
      )}

      {parsed.experience.length > 0 && (
        <Section title="Professional Experience">
          <div className="space-y-4">
            {parsed.experience.map((e, i) => {
              const [date, loc] = splitDuration(e.duration);
              return (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-bold text-neutral-900">
                      {e.title || "Role"}
                    </p>
                    {date && (
                      <p className="shrink-0 text-right text-neutral-700">
                        {date}
                      </p>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    {e.company && (
                      <p className="italic text-neutral-700">{e.company}</p>
                    )}
                    {loc && (
                      <p className="shrink-0 text-right text-neutral-700">
                        {loc}
                      </p>
                    )}
                  </div>
                  {e.highlights.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {e.highlights.map((h, j) => (
                        <Bullet key={j}>{h}</Bullet>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {(parsed.projects?.length ?? 0) > 0 && (
        <Section title="Projects">
          <div className="space-y-4">
            {parsed.projects!.map((pr, i) => (
              <div key={i}>
                <p className="font-bold text-neutral-900">
                  {pr.name || "Project"}
                </p>
                {pr.tech?.length > 0 && (
                  <p className="text-[12px] italic text-neutral-600">
                    {pr.tech.map(formatSkill).join(", ")}
                  </p>
                )}
                {pr.description && (
                  <ul className="mt-1">
                    <Bullet>{pr.description}</Bullet>
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {parsed.education.length > 0 && (
        <Section title="Education">
          <div className="space-y-3">
            {parsed.education.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-bold text-neutral-900">
                    {e.degree || "Qualification"}
                  </p>
                  {e.year && (
                    <p className="shrink-0 text-right text-neutral-700">
                      {e.year}
                    </p>
                  )}
                </div>
                {e.institution && (
                  <p className="italic text-neutral-700">{e.institution}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {skillGroups.length > 0 && (
        <Section title="Skills">
          <div className="space-y-1">
            {skillGroups.map((g) => (
              <p key={g.label}>
                <span className="font-bold text-neutral-900">{g.label}: </span>
                {g.skills.join(", ")}
              </p>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="border-b-2 border-neutral-800 pb-1 text-[15px] font-bold uppercase tracking-wide text-neutral-900">
        {title}
      </h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="select-none text-neutral-500">•</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
