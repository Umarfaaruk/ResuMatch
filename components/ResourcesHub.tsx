"use client";

import * as React from "react";
import {
  BookOpen,
  TrendingUp,
  FileText,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SkillGap } from "@/lib/types";

type Tab = "learn" | "market" | "guides";

const SALARY_TABLE = [
  { role: "Software Developer (Fresher)", range: "₹3.5 – 8 LPA" },
  { role: "Data Analyst (Fresher)", range: "₹3 – 6.5 LPA" },
  { role: "ML / AI Engineer (Fresher)", range: "₹5 – 12 LPA" },
  { role: "Frontend Developer (Fresher)", range: "₹3 – 7 LPA" },
  { role: "Backend Developer (Fresher)", range: "₹4 – 9 LPA" },
  { role: "DevOps / Cloud (Fresher)", range: "₹4 – 10 LPA" },
  { role: "QA / Test Engineer (Fresher)", range: "₹3 – 6 LPA" },
];

const HIRING_CALENDAR = [
  { period: "Jul – Sep", what: "Campus placement season kicks off; service companies (TCS NQT, Infosys, Wipro, Accenture) open mass-hiring registrations." },
  { period: "Aug – Nov", what: "Product companies run off-campus drives and hiring challenges (coding contests double as pipelines)." },
  { period: "Dec – Feb", what: "Internship-to-PPO conversions; startups hire for Jan starts; GATE results open PSU routes." },
  { period: "Mar – Jun", what: "Off-campus openings for immediate joiners peak as attrition backfills are approved in new budgets." },
];

const GUIDES: { title: string; body: string[] }[] = [
  {
    title: "How ATS actually reads your resume",
    body: [
      "An ATS (Applicant Tracking System) parses your resume into fields — name, skills, experience — then recruiters filter by keyword. If parsing fails, a human never sees you.",
      "Rules that matter: single column, no tables/graphics/text boxes, standard headings (SUMMARY, EXPERIENCE, EDUCATION, SKILLS), and a real text PDF (never a scanned image).",
      "Mirror the job description's exact keywords where they're honestly true for you — 'REST APIs' and 'RESTful services' are different strings to a filter.",
      "Jobly's ATS version of your resume follows all of these rules automatically — use the plain-text tab when a portal asks you to paste your resume.",
    ],
  },
  {
    title: "Cold-message templates that get referrals",
    body: [
      "Referrals convert ~10x better than cold applications. Message employees, not HR.",
      "LinkedIn template: \"Hi <Name>, I'm a final-year CS student and I've applied for <Role> (Job ID <id>) at <Company>. My background in <top skill> matches the role — I built <one-line project with a metric>. Would you be open to referring me? Happy to share my resume. Thank you!\"",
      "Keep it under 80 words, name a specific role + job ID, include one quantified achievement, and attach your resume PDF immediately when they reply.",
      "Follow up exactly once after 4–5 days. Message 10–15 people per target company; a 20% reply rate is normal.",
    ],
  },
  {
    title: "Salary negotiation for freshers",
    body: [
      "Yes, freshers can negotiate — after the offer, never before. Once they've chosen you, a 10–20% bump is a routine ask.",
      "Script: \"Thank you — I'm excited about the role. Based on my <skill/internship/project>, and market ranges for this position, would <X> be possible?\" where X is ~15% above their number.",
      "Never bluff a competing offer you don't have. If pay is fixed (mass hiring), ask about joining bonus, earlier review cycle, or learning budget instead.",
      "Get the final offer in writing before resigning from anything or declining other offers.",
    ],
  },
  {
    title: "LinkedIn profile checklist",
    body: [
      "Headline: not 'Student at X' — write 'Aspiring <Role> | <Top 3 skills> | <standout project/achievement>'.",
      "About: 3–4 lines, first person, same content as your resume summary plus what you're looking for.",
      "Feature your 2 best projects with links; ask professors/internship mentors for one-line recommendations.",
      "Set 'Open to Work' (recruiters-only mode if you prefer), and add the 10–15 skills from your Jobly resume so recruiter searches find you.",
    ],
  },
  {
    title: "Interview-day checklist",
    body: [
      "The night before: re-read the job description, review your own resume line by line (everything on it is fair game), and prepare a 60-second introduction.",
      "Prepare 3 STAR stories (Situation-Task-Action-Result) covering: a technical challenge, a teamwork/conflict moment, and a failure you fixed.",
      "For online interviews: test camera/mic/net 30 minutes early, keep your resume + the JD open, and sit facing a light source.",
      "Always ask 2 questions at the end — about the team's tech stack and what a great first 90 days looks like. Send a 3-line thank-you message the same day.",
    ],
  },
];

interface ResourcesHubProps {
  skillGaps: SkillGap[];
  hasResume: boolean;
}

export function ResourcesHub({ skillGaps, hasResume }: ResourcesHubProps) {
  const [tab, setTab] = React.useState<Tab>("learn");
  const [done, setDone] = React.useState<Record<string, boolean>>({});
  const [openGuide, setOpenGuide] = React.useState<number | null>(0);

  // Learning progress persists locally per browser.
  React.useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem("jobly-learn-progress") ?? "{}"));
    } catch {
      /* fresh start */
    }
  }, []);

  function toggleDone(skill: string) {
    setDone((cur) => {
      const next = { ...cur, [skill]: !cur[skill] };
      localStorage.setItem("jobly-learn-progress", JSON.stringify(next));
      return next;
    });
  }

  const TABS: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: "learn", label: "Learn", icon: BookOpen },
    { key: "market", label: "Market", icon: TrendingUp },
    { key: "guides", label: "Guides", icon: FileText },
  ];

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-secondary/60 p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "learn" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills to learn next</CardTitle>
            <CardDescription>
              {hasResume
                ? "The skills most often missing across your best job matches — each with a free course. Tick them off as you learn."
                : "Upload a resume to get a personalized list of the skills standing between you and your best matches."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {skillGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {hasResume
                  ? "No gaps found — your skills already cover your top matches. Browse more jobs to widen the net."
                  : "Nothing to show yet."}
              </p>
            ) : (
              <ul className="space-y-2">
                {skillGaps.map((g) => (
                  <li
                    key={g.skill}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <button
                      onClick={() => toggleDone(g.skill)}
                      aria-label={done[g.skill] ? "Mark as not learned" : "Mark as learned"}
                      className="shrink-0"
                    >
                      {done[g.skill] ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-medium capitalize text-foreground",
                          done[g.skill] && "line-through opacity-60"
                        )}
                      >
                        {g.skill}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {g.resourceName}
                      </p>
                    </div>
                    <a
                      href={g.resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Learn free
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "market" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Fresher salary ranges (India)
              </CardTitle>
              <CardDescription>
                Typical annual CTC for 0–1 year roles. Product companies and
                metros sit at the top of each range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {SALARY_TABLE.map((r) => (
                  <li
                    key={r.role}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="text-foreground">{r.role}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {r.range}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hiring calendar</CardTitle>
              <CardDescription>
                When fresher hiring actually happens — time your applications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {HIRING_CALENDAR.map((c) => (
                  <li key={c.period} className="flex gap-3 text-sm">
                    <Badge variant="warm" className="h-fit shrink-0">
                      {c.period}
                    </Badge>
                    <span className="text-muted-foreground">{c.what}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "guides" && (
        <div className="space-y-3">
          {GUIDES.map((g, i) => (
            <Card key={g.title}>
              <button
                onClick={() => setOpenGuide(openGuide === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
                aria-expanded={openGuide === i}
              >
                <span className="font-semibold text-foreground">{g.title}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    openGuide === i && "rotate-180"
                  )}
                />
              </button>
              {openGuide === i && (
                <CardContent className="space-y-2 pt-0">
                  {g.body.map((p, j) => (
                    <p key={j} className="text-sm leading-relaxed text-muted-foreground">
                      {p}
                    </p>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
