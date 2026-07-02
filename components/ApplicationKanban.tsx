"use client";

import * as React from "react";
import {
  Building2,
  MapPin,
  ExternalLink,
  Trash2,
  Loader2,
  StickyNote,
  CalendarCheck2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  updateApplicationStatus,
  deleteApplication,
  updateApplicationNotes,
} from "@/app/actions/applications";
import type { Application, ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLUMNS: { key: ApplicationStatus; label: string; accent: string }[] = [
  { key: "saved", label: "Saved", accent: "bg-muted-foreground" },
  { key: "applied", label: "Applied", accent: "bg-primary" },
  { key: "interview", label: "Interview", accent: "bg-warm" },
  { key: "rejected", label: "Rejected", accent: "bg-destructive" },
];

const STATUS_OPTIONS: ApplicationStatus[] = [
  "saved",
  "applied",
  "interview",
  "rejected",
];

export function ApplicationKanban({
  initialApplications,
}: {
  initialApplications: Application[];
}) {
  const { toast } = useToast();
  const [apps, setApps] = React.useState<Application[]>(initialApplications);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [notesId, setNotesId] = React.useState<string | null>(null);
  const [notesDraft, setNotesDraft] = React.useState("");

  // Keep local state in sync if the server data changes (e.g. after refresh).
  React.useEffect(() => {
    setApps(initialApplications);
  }, [initialApplications]);

  async function changeStatus(id: string, status: ApplicationStatus) {
    setPendingId(id);
    const prev = apps;
    setApps((cur) => cur.map((a) => (a.id === id ? { ...a, status } : a)));
    const res = await updateApplicationStatus(id, status);
    setPendingId(null);
    if (!res.ok) {
      setApps(prev);
      toast({ title: "Update failed", description: res.error, variant: "error" });
    }
  }

  function toggleNotes(app: Application) {
    if (notesId === app.id) {
      setNotesId(null);
    } else {
      setNotesId(app.id);
      setNotesDraft(app.notes ?? "");
    }
  }

  async function saveNotes(id: string) {
    setPendingId(id);
    const res = await updateApplicationNotes(id, notesDraft);
    setPendingId(null);
    if (res.ok) {
      setApps((cur) =>
        cur.map((a) =>
          a.id === id ? { ...a, notes: notesDraft.trim() || null } : a
        )
      );
      setNotesId(null);
      toast({ title: "Notes saved", variant: "success" });
    } else {
      toast({ title: "Couldn't save notes", description: res.error, variant: "error" });
    }
  }

  async function remove(id: string) {
    setPendingId(id);
    const prev = apps;
    setApps((cur) => cur.filter((a) => a.id !== id));
    const res = await deleteApplication(id);
    setPendingId(null);
    if (!res.ok) {
      setApps(prev);
      toast({ title: "Delete failed", description: res.error, variant: "error" });
    } else {
      toast({ title: "Removed from tracker", variant: "success" });
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible no-scrollbar">
      {COLUMNS.map((col) => {
        const items = apps.filter((a) => a.status === col.key);
        return (
          <div
            key={col.key}
            className="flex w-72 shrink-0 flex-col rounded-xl border bg-secondary/40 lg:w-auto"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", col.accent)} />
                <span className="text-sm font-semibold text-foreground">
                  {col.label}
                </span>
              </div>
              <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {items.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-3">
              {items.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  Nothing here yet.
                </p>
              )}
              {items.map((app) => {
                const busy = pendingId === app.id;
                return (
                  <div
                    key={app.id}
                    className="rounded-lg border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight text-foreground">
                        {app.job?.title ?? "Job"}
                      </p>
                      {busy && (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                      {app.job?.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {app.job.company}
                        </span>
                      )}
                      {app.job?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {app.job.location}
                        </span>
                      )}
                      {app.applied_date && (
                        <span className="flex items-center gap-1">
                          <CalendarCheck2 className="h-3 w-3" />
                          Applied{" "}
                          {new Date(app.applied_date).toLocaleDateString(
                            undefined,
                            { day: "numeric", month: "short" }
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      <Select
                        value={app.status}
                        onValueChange={(v) =>
                          changeStatus(app.id, v as ApplicationStatus)
                        }
                        disabled={busy}
                      >
                        <SelectTrigger className="h-8 flex-1 text-xs capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {app.job?.source_url && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title="Open job posting"
                        >
                          <a
                            href={app.job.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 shrink-0",
                          app.notes
                            ? "text-warm hover:text-warm"
                            : "text-muted-foreground"
                        )}
                        onClick={() => toggleNotes(app)}
                        disabled={busy}
                        title={app.notes ? "View notes" : "Add notes"}
                      >
                        <StickyNote className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(app.id)}
                        disabled={busy}
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {notesId === app.id && (
                      <div className="mt-2.5 space-y-1.5">
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Recruiter contact, referral, follow-up date…"
                          rows={3}
                          className="w-full resize-none rounded-md border bg-background p-2 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setNotesId(null)}
                            disabled={busy}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => saveNotes(app.id)}
                            disabled={busy}
                          >
                            Save notes
                          </Button>
                        </div>
                      </div>
                    )}
                    {notesId !== app.id && app.notes && (
                      <p className="mt-2 line-clamp-2 rounded-md bg-secondary/60 px-2 py-1.5 text-xs text-muted-foreground">
                        {app.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
