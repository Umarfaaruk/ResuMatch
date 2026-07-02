import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { cleanParsedResume, repairInterleavedText } from "@/lib/resume-format";
import type { ParsedResume } from "@/lib/types";

export const dynamic = "force-dynamic";

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
