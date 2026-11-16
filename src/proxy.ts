import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { boundedSupabaseFetch, supabaseConfiguration } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = supabaseConfiguration();
  if (config.status !== "ready") return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    global: { fetch: boundedSupabaseFetch },
    cookieOptions: { httpOnly: true, sameSite: "lax", path: "/", secure: request.nextUrl.protocol === "https:" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  try { await supabase.auth.getClaims(); } catch { /* Teises atskirai tikrina serverio puslapiai ir API. */ }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = { matcher: ["/((?!api/artworks|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
