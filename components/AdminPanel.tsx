"use client";

import * as React from "react";
import {
  Users,
  FileText,
  KanbanSquare,
  Briefcase,
  LifeBuoy,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { updateIssue, type AdminData, type AdminIssue } from "@/app/actions/admin";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<AdminIssue["status"], string> = {
  open: "bg-warm/15 text-warm",
  in_progress: "bg-primary/15 text-primary",
  resolved: "bg-success/15 text-success",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminPanel({ data }: { data: AdminData }) {
  const { stats } = data;
  const [issueFilter, setIssueFilter] = React.useState<string>("unresolved");

  const issues = data.issues.filter((i) =>
    issueFilter === "all"
      ? true
      : issueFilter === "unresolved"
        ? i.status !== "resolved"
        : i.status === issueFilter
  );

  const STAT_TILES = [
    { label: "Users", value: stats.users, icon: Users },
    { label: "Resumes", value: stats.resumes, icon: FileText },
    { label: "Applications", value: stats.applications, icon: KanbanSquare },
    { label: "Live jobs", value: stats.jobs, icon: Briefcase },
    { label: "Open issues", value: stats.openIssues, icon: LifeBuoy },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_TILES.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4.5 w-4.5 h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-bold leading-none text-foreground">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Issues queue */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Support issues</CardTitle>
            <CardDescription>
              Reply and resolve — users see your reply instantly in their app.
            </CardDescription>
          </div>
          <Select value={issueFilter} onValueChange={setIssueFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {issues.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No issues here. 🎉
            </p>
          ) : (
            issues.map((issue) => <IssueRow key={issue.id} issue={issue} />)
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
          <CardDescription>
            Everyone on the platform, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">User</th>
                <th className="pb-2 pr-3 font-medium">Joined</th>
                <th className="pb-2 pr-3 font-medium">Last active</th>
                <th className="pb-2 pr-3 text-center font-medium">Resumes</th>
                <th className="pb-2 pr-3 text-center font-medium">Applications</th>
                <th className="pb-2 text-center font-medium">Open issues</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-foreground">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {fmtDate(u.last_sign_in_at)}
                  </td>
                  <td className="py-2.5 pr-3 text-center text-foreground">
                    {u.resumes}
                  </td>
                  <td className="py-2.5 pr-3 text-center text-foreground">
                    {u.applications}
                  </td>
                  <td className="py-2.5 text-center">
                    {u.open_issues > 0 ? (
                      <span className="rounded-full bg-warm/15 px-2 py-0.5 text-xs font-medium text-warm">
                        {u.open_issues}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function IssueRow({ issue }: { issue: AdminIssue }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = React.useState(issue.status === "open");
  const [reply, setReply] = React.useState(issue.admin_reply ?? "");
  const [status, setStatus] = React.useState<AdminIssue["status"]>(issue.status);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    const res = await updateIssue(issue.id, status, reply);
    setSaving(false);
    if (res.ok) {
      toast({ title: "Issue updated", variant: "success" });
      setExpanded(false);
    } else {
      toast({ title: "Update failed", description: res.error, variant: "error" });
    }
  }

  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            STATUS_STYLES[status]
          )}
        >
          {status.replace("_", " ")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {issue.subject}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {issue.user_name} · {issue.user_email} · {fmtDate(issue.created_at)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t px-4 py-3">
          <p className="whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm text-foreground">
            {issue.message}
          </p>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply the user will see…"
            rows={3}
            className="w-full resize-none rounded-md border bg-background p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center justify-end gap-2">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as AdminIssue["status"])}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={save} disabled={saving} size="sm">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & notify
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
