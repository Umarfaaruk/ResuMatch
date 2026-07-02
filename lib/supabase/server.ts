import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Uses the anon key + the user's session cookies (RLS applies).
 * Memoized per request so every caller in a render shares one client.
 */
export const createClient = cache(_createClient);

function _createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `set` throws when called from a Server Component (read-only).
            // Safe to ignore — the middleware refreshes the session cookie.
          }
        },
      },
    }
  );
}

/**
 * Current user, memoized per request. Pages, layouts, and queries all need
 * the user; without caching each caller costs a network round-trip to
 * Supabase Auth — the main source of slow page loads.
 */
export const getUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Service-role client — SERVER ONLY, bypasses RLS. Used exclusively by the
 * jobs sync route to write live job listings into the public jobs table.
 */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          /* no-op: service client is stateless */
        },
      },
    }
  );
}
