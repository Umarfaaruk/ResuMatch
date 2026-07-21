import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Rocket,
  Upload,
  Gauge,
  Send,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The platform serves three audiences. Items ship in stages — anything not
// yet live is labelled honestly instead of being a dead button.
const AUDIENCES: {
  icon: typeof GraduationCap;
  title: string;
  desc: string;
  items: { label: string; live: boolean }[];
}[] = [
  {
    icon: GraduationCap,
    title: "For Freshers & Students",
    desc: "Everything between you and your first offer letter.",
    items: [
      { label: "AI Resume Builder", live: true },
      { label: "ATS Score Check", live: true },
      { label: "Jobs, Internships & Walk-ins", live: true },
      { label: "Interview Prep", live: true },
      { label: "Portfolio Builder", live: false },
      { label: "Referrals", live: false },
    ],
  },
  {
    icon: Briefcase,
    title: "For Employees",
    desc: "Grow your career — and earn by helping others grow theirs.",
    items: [
      { label: "Job Opportunities", live: true },
      { label: "AI Assistant (cover letters, tailoring)", live: true },
      { label: "Career Growth & Skill Paths", live: true },
      { label: "Refer & Earn", live: false },
      { label: "Professional Network", live: false },
    ],
  },
  {
    icon: Rocket,
    title: "For Startups",
    desc: "Showcase what you're building and hire people who get it.",
    items: [
      { label: "Startup Showcase", live: false },
      { label: "Hire Talent", live: false },
      { label: "Find Co-founders", live: false },
      { label: "Promote Your Startup", live: false },
    ],
  },
];

const STEPS = [
  {
    icon: Upload,
    title: "Add your resume",
    desc: "Upload a PDF/DOCX or build one from scratch — AI structures it and rewrites every bullet ATS-safe.",
  },
  {
    icon: Gauge,
    title: "See where you stand",
    desc: "Get your ATS score, your match percentage on every live job and internship, and the exact skills to learn next.",
  },
  {
    icon: Send,
    title: "Apply & track",
    desc: "One click opens the direct application page and logs it on your board. Prep for the interview in the same tab.",
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  // Resilience: if an OAuth code lands on the root (some Supabase Site URL
  // configs redirect here instead of /auth/callback), forward it to the
  // callback handler so the session is exchanged instead of silently dropped.
  if (searchParams?.code) {
    redirect(`/auth/callback?code=${searchParams.code}&next=/dashboard`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Existing users skip the landing page and go straight to their dashboard.
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center pt-1">
            <Logo className="ml-2 text-xl" />
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="warm">
              <Link href="/login">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-warm/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl"
        />
        <div className="container relative grid gap-12 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-warm" />
              For students, professionals & startups
            </span>
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Turn your resume into{" "}
              <span className="text-warm">interview calls</span>.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-primary-foreground/80">
              One place for the whole hunt: an AI-perfected ATS resume, live
              jobs and internships matched to your skills, direct apply links,
              and a tracker that keeps you on top of every application.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="warm">
                <Link href="/login">
                  Build my resume free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              >
                <Link href="#how">See how it works</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/80">
              {["100% free", "No credit card", "Live jobs & internships"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-warm" />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Mock match card — the product in one glance */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Full Stack Developer</p>
                      <span className="rounded-full bg-warm/90 px-1.5 py-0.5 text-[10px] font-bold text-warm-foreground">
                        NEW
                      </span>
                    </div>
                    <p className="text-sm text-primary-foreground/70">
                      Razorpay · Bangalore · Posted today
                    </p>
                  </div>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-warm text-lg font-bold text-warm">
                    86%
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-primary-foreground/60">
                    Matched skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["React", "Node.js", "PostgreSQL", "Git"].map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-warm/20 px-2.5 py-0.5 text-xs font-medium text-warm"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-primary-foreground/60">
                    Skills to add
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["REST API", "TypeScript"].map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-primary-foreground/80"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <span className="flex h-9 flex-1 items-center justify-center rounded-lg bg-warm text-sm font-semibold text-warm-foreground">
                    Apply now
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-primary-foreground/80">
                    ♡
                  </span>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-primary-foreground/50">
                Live feed · refreshed every minute · direct apply links
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="container py-20" id="features">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            One platform, three journeys
          </h2>
          <p className="mt-3 text-muted-foreground">
            Whether you&apos;re hunting your first role, growing your career,
            or building a team — Jobly is your home base.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div
              key={a.title}
              className="group flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <a.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {a.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
              <ul className="mt-4 space-y-2">
                {a.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2
                      className={
                        item.live
                          ? "h-4 w-4 shrink-0 text-success"
                          : "h-4 w-4 shrink-0 text-muted-foreground/40"
                      }
                    />
                    <span
                      className={
                        item.live
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {item.label}
                    </span>
                    {!item.live && (
                      <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Soon
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-secondary/50 py-20" id="how">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Three steps. A few minutes.
            </h2>
            <p className="mt-3 text-muted-foreground">
              No forms to fill twice, no tabs to juggle — the flow does the
              busywork for you.
            </p>
          </div>
          <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            {/* connecting line (desktop) */}
            <div
              aria-hidden
              className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-warm/60 via-primary/30 to-warm/60 md:block"
            />
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center md:px-4">
                <span className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                  <step.icon className="h-6 w-6" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-warm text-xs font-bold text-warm-foreground">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-5 font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <Button asChild size="lg" variant="warm">
              <Link href="/login">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">
              Takes about two minutes from sign-up to your first matches.
            </p>
          </div>
        </div>
      </section>

      {/* Final strip */}
      <section className="container py-14">
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border bg-primary px-8 py-10 text-primary-foreground sm:flex-row">
          <div>
            <h3 className="text-xl font-bold tracking-tight">
              Your first offer letter is a resume away.
            </h3>
            <p className="mt-1 text-sm text-primary-foreground/75">
              Join free — upload your resume and see your matches in minutes.
            </p>
          </div>
          <Button asChild size="lg" variant="warm" className="shrink-0">
            <Link href="/login">
              <Briefcase className="h-4 w-4" />
              Start now
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Jobly. Free for everyone.</p>
          <p>Jobs · Internships · ATS Resumes · Interview Prep</p>
        </div>
      </footer>
    </div>
  );
}
