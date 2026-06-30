"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { buildResume, type BuilderInput } from "@/app/actions/resume";
import type { ExperienceLevel } from "@/lib/types";

interface ExpRow {
  title: string;
  company: string;
  duration: string;
  highlights: string; // newline-separated in the form
}
interface ProjRow {
  name: string;
  description: string;
  tech: string; // comma-separated
}
interface EduRow {
  degree: string;
  institution: string;
  year: string;
}

export function ResumeBuilderForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [links, setLinks] = React.useState("");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [level, setLevel] = React.useState<ExperienceLevel>("fresher");
  const [summary, setSummary] = React.useState("");

  const [skills, setSkills] = React.useState<string[]>([]);
  const [skillInput, setSkillInput] = React.useState("");

  const [experience, setExperience] = React.useState<ExpRow[]>([
    { title: "", company: "", duration: "", highlights: "" },
  ]);
  const [projects, setProjects] = React.useState<ProjRow[]>([
    { name: "", description: "", tech: "" },
  ]);
  const [education, setEducation] = React.useState<EduRow[]>([
    { degree: "", institution: "", year: "" },
  ]);

  function addSkillsFrom(value: string) {
    const parts = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) {
      setSkills((cur) => Array.from(new Set([...cur, ...parts])));
      setSkillInput("");
    }
  }

  function handleSkillKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkillsFrom(skillInput);
    } else if (e.key === "Backspace" && !skillInput && skills.length) {
      setSkills((cur) => cur.slice(0, -1));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const input: BuilderInput = {
      name,
      email,
      phone,
      location,
      links: links.split(",").map((s) => s.trim()).filter(Boolean),
      summary,
      role_title: roleTitle,
      experience_level: level,
      skills,
      experience: experience.map((x) => ({
        title: x.title,
        company: x.company,
        duration: x.duration,
        highlights: x.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
      })),
      projects: projects.map((p) => ({
        name: p.name,
        description: p.description,
        tech: p.tech.split(",").map((t) => t.trim()).filter(Boolean),
      })),
      education,
    };

    const res = await buildResume(input);
    setSaving(false);
    if (res.ok) {
      toast({
        title: "Resume created!",
        description: "Your ATS + humanized versions are ready.",
        variant: "success",
      });
      router.push("/resume");
      router.refresh();
    } else {
      toast({ title: "Couldn't save", description: res.error, variant: "error" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" />
          </Field>
          <Field label="Target role">
            <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Frontend Developer" />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXXXXXXX" />
          </Field>
          <Field label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hyderabad, India" />
          </Field>
          <Field label="Experience level">
            <Select value={level} onValueChange={(v) => setLevel(v as ExperienceLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fresher">Fresher (&lt;1 yr)</SelectItem>
                <SelectItem value="junior">Junior (1–2 yrs)</SelectItem>
                <SelectItem value="mid">Mid (3+ yrs)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Links (comma-separated)" className="sm:col-span-2">
            <Input value={links} onChange={(e) => setLinks(e.target.value)} placeholder="github.com/you, linkedin.com/in/you" />
          </Field>
          <Field label="Professional summary" className="sm:col-span-2">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="2–3 sentences about who you are and what you're great at. Leave blank to let AI draft it."
              className="min-h-[80px]"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="mb-1.5 block">Type a skill and press Enter (or paste comma-separated)</Label>
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKey}
            onBlur={() => addSkillsFrom(skillInput)}
            placeholder="React, TypeScript, SQL…"
          />
          {skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 capitalize">
                  {s}
                  <button
                    type="button"
                    onClick={() => setSkills((cur) => cur.filter((x) => x !== s))}
                    className="rounded-full hover:text-destructive"
                    aria-label={`Remove ${s}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Experience */}
      <RepeatableCard
        title="Experience"
        onAdd={() =>
          setExperience((c) => [...c, { title: "", company: "", duration: "", highlights: "" }])
        }
        addLabel="Add experience"
      >
        {experience.map((row, i) => (
          <RepeatRow key={i} onRemove={experience.length > 1 ? () => setExperience((c) => c.filter((_, j) => j !== i)) : undefined}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Job title"
                value={row.title}
                onChange={(e) => setExperience((c) => c.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
              />
              <Input
                placeholder="Company"
                value={row.company}
                onChange={(e) => setExperience((c) => c.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))}
              />
            </div>
            <Input
              placeholder="Duration (e.g. Jun 2024 – Present)"
              value={row.duration}
              onChange={(e) => setExperience((c) => c.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))}
            />
            <Textarea
              placeholder="One achievement per line. Start with an action verb; add numbers where you can."
              value={row.highlights}
              onChange={(e) => setExperience((c) => c.map((x, j) => (j === i ? { ...x, highlights: e.target.value } : x)))}
              className="min-h-[80px]"
            />
          </RepeatRow>
        ))}
      </RepeatableCard>

      {/* Projects */}
      <RepeatableCard
        title="Projects"
        onAdd={() => setProjects((c) => [...c, { name: "", description: "", tech: "" }])}
        addLabel="Add project"
      >
        {projects.map((row, i) => (
          <RepeatRow key={i} onRemove={projects.length > 1 ? () => setProjects((c) => c.filter((_, j) => j !== i)) : undefined}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Project name"
                value={row.name}
                onChange={(e) => setProjects((c) => c.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <Input
                placeholder="Tech (comma-separated)"
                value={row.tech}
                onChange={(e) => setProjects((c) => c.map((x, j) => (j === i ? { ...x, tech: e.target.value } : x)))}
              />
            </div>
            <Textarea
              placeholder="What it does and your role in building it."
              value={row.description}
              onChange={(e) => setProjects((c) => c.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
              className="min-h-[64px]"
            />
          </RepeatRow>
        ))}
      </RepeatableCard>

      {/* Education */}
      <RepeatableCard
        title="Education"
        onAdd={() => setEducation((c) => [...c, { degree: "", institution: "", year: "" }])}
        addLabel="Add education"
      >
        {education.map((row, i) => (
          <RepeatRow key={i} onRemove={education.length > 1 ? () => setEducation((c) => c.filter((_, j) => j !== i)) : undefined}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Degree"
                value={row.degree}
                onChange={(e) => setEducation((c) => c.map((x, j) => (j === i ? { ...x, degree: e.target.value } : x)))}
              />
              <Input
                placeholder="Institution"
                value={row.institution}
                onChange={(e) => setEducation((c) => c.map((x, j) => (j === i ? { ...x, institution: e.target.value } : x)))}
              />
              <Input
                placeholder="Year"
                value={row.year}
                onChange={(e) => setEducation((c) => c.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))}
              />
            </div>
          </RepeatRow>
        ))}
      </RepeatableCard>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-background/90 py-4 backdrop-blur">
        <p className="mr-auto hidden text-sm text-muted-foreground sm:block">
          AI will polish the wording into ATS + humanized versions.
        </p>
        <Button type="submit" variant="warm" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {saving ? "Building…" : "Create my resume"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function RepeatableCard({
  title,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function RepeatRow({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <div className="relative space-y-3 rounded-lg border p-4">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-destructive"
          aria-label="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  );
}
