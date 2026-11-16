"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { configuredSiteOrigin } from "@/lib/supabase/config";
import { authErrorMessage, safeAuthNext, validateCredentials, type AuthFormState } from "@/lib/auth-validation";

function credentials(form: FormData, registering = false) {
  if (form.getAll("email").length !== 1 || form.getAll("password").length !== 1) return null;
  return validateCredentials(form.get("email"), form.get("password"), registering);
}

export async function login(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const input = credentials(form);
  if (!input) return { error: "Įrašyk tinkamą el. paštą ir slaptažodį (iki 128 ženklų)." };
  const client = await createSupabaseServer();
  if (!client) return { error: "Paskyros dar neprijungtos. Kol kas gali naudoti demonstracinę kolekciją." };
  try {
    const { error } = await client.auth.signInWithPassword(input);
    if (error) return { error: authErrorMessage(error.code, error.status) };
  } catch { return { error: authErrorMessage() }; }
  revalidatePath("/", "layout");
  redirect(safeAuthNext(form.get("next")));
}

export async function register(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const input = credentials(form, true);
  if (!input) return { error: "Įrašyk tinkamą el. paštą ir 12–128 ženklų slaptažodį." };
  const client = await createSupabaseServer(), origin = configuredSiteOrigin();
  if (!client || !origin) return { error: "Registracija dar neprijungta. Pabandyk vėliau." };
  try {
    const { data, error } = await client.auth.signUp({ ...input, options: { emailRedirectTo: `${origin}/auth/confirm` } });
    if (error) return { error: authErrorMessage(error.code, error.status) };
    if (data.session) { revalidatePath("/", "layout"); }
    else return { message: "Jei registracija priimta, el. paštu gausi patvirtinimo nuorodą. Patikrink ir šlamšto aplanką, tada prisijunk." };
  } catch { return { error: authErrorMessage() }; }
  redirect("/profile");
}

export async function logout(): Promise<AuthFormState> {
  const client = await createSupabaseServer();
  if (!client) return { error: "Paskyrų paslauga neprijungta." };
  try { const { error } = await client.auth.signOut({ scope: "local" }); if (error) return { error: "Atsijungti nepavyko. Pabandyk dar kartą." }; }
  catch { return { error: "Atsijungti nepavyko. Pabandyk dar kartą." }; }
  revalidatePath("/", "layout"); redirect("/login");
}
