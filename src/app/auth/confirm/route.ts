import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { confirmAuthRequest } from "@/lib/auth-confirmation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = (path: string) => {
    const result = NextResponse.redirect(new URL(path, url.origin), 303);
    result.headers.set("Cache-Control", "private, no-store"); result.headers.set("Referrer-Policy", "no-referrer");
    return result;
  };
  try {
    const client = await createSupabaseServer();
    if (client && await confirmAuthRequest(url.searchParams, client.auth)) return response("/profile");
  } catch { /* Tokenai ir vidinės klaidos nerodomi. */ }
  return response("/auth/error");
}
