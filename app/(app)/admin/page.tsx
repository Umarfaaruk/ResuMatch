import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminPanel } from "@/components/AdminPanel";
import { getAdminUser } from "@/lib/admin";
import { getAdminData } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");

  const res = await getAdminData();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Admin
        </h1>
        <p className="mt-1 text-muted-foreground">
          Monitor users and resolve the issues they raise.
        </p>
      </header>

      {res.ok ? (
        <AdminPanel data={res.data} />
      ) : (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground">
          {res.error} — the admin panel needs the SUPABASE_SERVICE_ROLE_KEY
          environment variable (the service_role secret) to read across users.
        </p>
      )}
    </div>
  );
}
