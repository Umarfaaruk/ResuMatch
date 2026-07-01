import Link from "next/link";
import {
  FileText,
  Sparkles,
  Target,
  KanbanSquare,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Sparkles,
    title: "ATS-safe rewrite",
    desc: "AI parses your resume and rewrites it into a clean, single-column format that applicant-tracking systems can actually read.",
  },
  {
    icon: Target,
    title: "Ranked job matches",
    desc: "See roles scored by skill overlap, title fit, and experience level — so you apply where you actually stand a chance.",
  },
  {
    icon: KanbanSquare,
    title: "Application tracker",
    desc: "A simple Kanban board to move roles from Saved → Applied → Interview, so nothing slips through the cracks.",
  },
  {
    icon: GraduationCap,
    title: "Skill-gap coaching",
    desc: "Find the top skills you're missing across your best matches, each linked to a free resource to close the gap.",
  },
];

const STEPS = [
  "Upload your PDF or DOCX resume",
  "Get an ATS-optimized version in seconds",
  "Browse ranked matches and track applications",
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-primary">
              ResuMatch
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild variant="warm">
                  <Link href="/login">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-warm/20 blur-3xl"
        />
        <div className="container relative grid gap-12 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-warm" />
              Built for Indian freshers
            </span>
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Turn your resume into{" "}
              <span className="text-warm">interview calls</span>.
            </h1>
            <p className="mt-5 max-w-md text-lg text-primary-foreground/80">
              Upload once. ResuMatch makes your resume ATS-safe, ranks the jobs
              you fit best, tracks your applications, and shows the exact skills
              to learn next — all on a free plan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="warm">
                <Link href="/login">
                  Build my ATS resume
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
              {["100% free tier", "No credit card", "PDF & DOCX"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-warm" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock match card */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Full Stack Developer</p>
                  <p className="text-sm text-primary-foreground/70">
                    Razorpay · Bangalore
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-warm text-lg font-bold text-warm">
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
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20" id="features">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Everything you need to land the first role
          </h2>
          <p className="mt-3 text-muted-foreground">
            One workflow, from a rough resume to a tracked application.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
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
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className="relative rounded-xl bg-card p-6 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warm text-lg font-bold text-warm-foreground">
                  {i + 1}
                </span>
                <p className="mt-4 font-medium text-foreground">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg" variant="warm">
              <Link href="/login">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} ResuMatch. Free for everyone.</p>
          <p>Built with Next.js, Supabase &amp; Groq.</p>
        </div>
      </footer>
    </div>
  );
}
