import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /*
   * Only run on routes that need a session: the protected app pages (guard +
   * cookie refresh) and /login (redirect signed-in users away). Public pages
   * and API routes check auth themselves — skipping middleware there saves a
   * Supabase auth round-trip on every request.
   */
  matcher: [
    "/dashboard/:path*",
    "/jobs/:path*",
    "/resume/:path*",
    "/applications/:path*",
    "/interview/:path*",
    "/login",
  ],
};
