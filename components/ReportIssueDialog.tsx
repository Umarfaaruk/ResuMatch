"use client";

import * as React from "react";
import { LifeBuoy, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { raiseIssue, myIssues, type Issue } from "@/app/actions/issues";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<Issue["status"], { label: string; className: string }> = {
  open: { label: "Open", className: "bg-warm/15 text-warm" },
  in_progress: { label: "In progress", className: "bg-primary/15 text-primary" },
  resolved: { label: "Resolved", className: "bg-success/15 text-success" },
};

/** Sidebar entry: raise a support issue + track replies to previous ones. */
export function ReportIssueDialog() {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  async function load() {
    const res = await myIssues();
    if (res.ok) setIssues(res.data);
    setLoaded(true);
  }

  React.useEffect(() => {
    if (open) void load();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const res = await raiseIssue(subject, message);
    setSending(false);
    if (res.ok) {
      toast({
        title: "Issue submitted",
        description: "We'll look into it — check back here for a reply.",
        variant: "success",
      });
      setSubject("");
      setMessage("");
      void load();
    } else {
      toast({ title: "Couldn't submit", description: res.error, variant: "error" });
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <LifeBuoy className="h-4 w-4" />
        Report an issue
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>
              Something broken or confusing? Tell us — we read every report.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="issue-subject">Subject</Label>
              <Input
                id="issue-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. PDF download not working"
                required
                minLength={3}
                maxLength={150}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue-message">What happened?</Label>
              <textarea
                id="issue-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the problem and what you expected…"
                required
                minLength={10}
                maxLength={3000}
                rows={4}
                className="w-full resize-none rounded-md border bg-background p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit issue
              </Button>
            </div>
          </form>

          {loaded && issues.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your previous issues
              </p>
              {issues.map((i) => (
                <div key={i.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {i.subject}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_BADGE[i.status].className
                      )}
                    >
                      {STATUS_BADGE[i.status].label}
                    </span>
                  </div>
                  {i.admin_reply && (
                    <p className="mt-1.5 rounded-md bg-secondary/60 p-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Reply:{" "}
                      </span>
                      {i.admin_reply}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
