import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AppShell email={user.email ?? ""} fullName={profile?.full_name ?? null}>
      {children}
    </AppShell>
  );
}
