import Link from "next/link";
import { KanbanSquare, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApplicationKanban } from "@/components/ApplicationKanban";
import { getUserApplications } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const applications = await getUserApplications();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <KanbanSquare className="h-6 w-6 text-primary" />
          Applications
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track every role from saved to offer. Use the dropdown to move a card
          between columns.
        </p>
      </header>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="font-medium text-foreground">No applications yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Save or apply to jobs from your dashboard and they&apos;ll show up
              here on the board.
            </p>
            <Button asChild className="mt-1">
              <Link href="/dashboard">Browse matched jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ApplicationKanban initialApplications={applications} />
      )}
    </div>
  );
}
