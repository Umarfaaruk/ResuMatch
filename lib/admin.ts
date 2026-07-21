import "server-only";
import { getUser } from "@/lib/supabase/server";

// Comma-separated list of admin emails; defaults to the project owner so the
// panel works out of the box. Override with the ADMIN_EMAILS env var.
const DEFAULT_ADMINS = "umarfaaruk154246@gmail.com";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || DEFAULT_ADMINS)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** The signed-in user when they are an admin, else null. */
export async function getAdminUser() {
  const user = await getUser();
  if (!user?.email) return null;
  return adminEmails().includes(user.email.toLowerCase()) ? user : null;
}
