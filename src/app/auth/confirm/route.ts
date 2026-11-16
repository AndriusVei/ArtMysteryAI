import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url), token = url.searchParams.get("token_hash"), type = url.searchParams.get("type");
  const response = (path: string) => {
    const result = NextResponse.redirect(new URL(path, url.origin), 303);
    result.headers.set("Cache-Control", "private, no-store"); result.headers.set("Referrer-Policy", "no-referrer");
    return result;
  };
  if (!token || token.length > 2048 || (type !== "email" && type !== "signup")) return response("/auth/error");
  try {
    const client = await createSupabaseServer();
    if (client) { const { error } = await client.auth.verifyOtp({ token_hash: token, type }); if (!error) return response("/profile"); }
  } catch { /* Tokenai ir vidinės klaidos nerodomi. */ }
  return response("/auth/error");
}
