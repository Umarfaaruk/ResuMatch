"use client";

import * as React from "react";
import { Sparkles, Loader2, Code2, Users, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { interviewPrepAction } from "@/app/actions/ai";

interface Q {
  question: string;
  tip: string;
}
interface Prep {
  technical: Q[];
  behavioral: Q[];
  tips: string[];
}

export function InterviewPrep({
  defaultRole,
  suggestedRoles,
}: {
  defaultRole: string;
  suggestedRoles: string[];
}) {
  const { toast } = useToast();
  const [role, setRole] = React.useState(defaultRole);
  const [loading, setLoading] = React.useState(false);
  const [prep, setPrep] = React.useState<Prep | null>(null);

  async function generate() {
    setLoading(true);
    const res = await interviewPrepAction(role);
    setLoading(false);
    if (res.ok) setPrep(res.data);
    else toast({ title: "Couldn't generate", description: res.error, variant: "error" });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="role" className="mb-1.5 block">
              Role you&apos;re preparing for
            </Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Developer"
            />
            {suggestedRoles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestedRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-warm/50 hover:text-foreground"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={generate} disabled={loading || !role.trim()} variant="warm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Preparing…" : prep ? "Regenerate" : "Generate questions"}
          </Button>
        </CardContent>
      </Card>

      {loading && !prep && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-warm" />
          <p className="text-sm text-muted-foreground">
            Tailoring questions to your resume and role…
          </p>
        </div>
      )}

      {prep && (
        <div className="space-y-6">
          <QuestionSection
            icon={<Code2 className="h-5 w-5 text-primary" />}
            title="Technical questions"
            questions={prep.technical}
          />
          <QuestionSection
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Behavioral & HR questions"
            questions={prep.behavioral}
          />
          {prep.tips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-warm" />
                  Game-day tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {prep.tips.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-warm">•</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionSection({
  icon,
  title,
  questions,
}: {
  icon: React.ReactNode;
  title: string;
  questions: Q[];
}) {
  if (questions.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="rounded-lg border p-4">
            <p className="font-medium text-foreground">
              {i + 1}. {q.question}
            </p>
            {q.tip && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Tip: </span>
                {q.tip}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
