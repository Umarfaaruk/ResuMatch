import { Library } from "lucide-react";
import { ResourcesHub } from "@/components/ResourcesHub";
import { getActiveResume, getAllJobs } from "@/lib/queries";
import { getMatchedJobs } from "@/lib/matching";
import { getSkillGaps } from "@/lib/resources";
import type { ParsedResume, SkillGap } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const resume = await getActiveResume();
  const hasResume = Boolean(resume?.parsed_json);

  let skillGaps: SkillGap[] = [];
  if (hasResume) {
    const jobs = await getAllJobs();
    const matches = getMatchedJobs(
      resume!.parsed_json as ParsedResume,
      jobs,
      20
    );
    skillGaps = getSkillGaps(matches, 6);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <Library className="h-6 w-6 text-primary" />
          Resources
        </h1>
        <p className="mt-1 text-muted-foreground">
          Everything around the job hunt in one place — skills to learn, salary
          data, and battle-tested guides.
        </p>
      </header>

      <ResourcesHub skillGaps={skillGaps} hasResume={hasResume} />
    </div>
  );
}
