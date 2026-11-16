"use client";

import { useActionState } from "react";
import { login, register, logout, resendConfirmation } from "@/app/auth/actions";
import type { AuthFormState } from "@/lib/auth-validation";

export function AuthForm({ mode, next = "/profile", enabled }: { mode: "login" | "register"; next?: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(mode === "register" ? register : login, {});
  return <form action={action} aria-busy={pending} className="mt-8 max-w-md space-y-5">
    <input type="hidden" name="next" value={next} />
    <fieldset disabled={pending || !enabled} className="space-y-5">
      <legend className="sr-only">{mode === "register" ? "Registracija" : "Prisijungimas"}</legend>
      <div><label htmlFor="auth-email" className="mb-2 block text-sm font-semibold">El. paštas</label>
        <input id="auth-email" name="email" type="email" required maxLength={254} autoComplete="email" className="min-h-12 w-full border border-line bg-white/50 px-4 py-3" /></div>
      <div><label htmlFor="auth-password" className="mb-2 block text-sm font-semibold">Slaptažodis</label>
        <input id="auth-password" name="password" type="password" required minLength={mode === "register" ? 12 : 1} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} aria-describedby="password-help" className="min-h-12 w-full border border-line bg-white/50 px-4 py-3" />
        <p id="password-help" className="mt-2 text-xs leading-6 text-muted">{mode === "register" ? "Naudok unikalų 12–128 ženklų slaptažodį. Gali reikėti patvirtinti el. paštą." : "Įrašyk savo paskyros slaptažodį."}</p></div>
      <button type="submit" className="min-h-12 bg-ink px-7 py-3 text-paper hover:bg-gold disabled:opacity-50">{pending ? "Palauk…" : mode === "register" ? "Sukurti paskyrą" : "Prisijungti"}</button>
    </fieldset>
    {state.error && <p role="alert" className="text-sm leading-7">{state.error}</p>}
    {state.message && <p role="status" className="text-sm leading-7">{state.message}</p>}
  </form>;
}

export function LogoutForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(logout, {});
  return <form action={action} className="mt-8"><button disabled={pending} className="min-h-12 border border-ink px-6 py-3 disabled:opacity-50">{pending ? "Atsijungiama…" : "Atsijungti šiame įrenginyje"}</button>{state.error && <p role="alert" className="mt-4">{state.error}</p>}</form>;
}

export function ConfirmationResendForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(resendConfirmation, {});
  return <details data-resend className="mt-8 max-w-md border-t border-line pt-5">
    <summary className="cursor-pointer py-2 text-sm underline underline-offset-4">Negavai patvirtinimo laiško arba nuoroda nebegalioja?</summary>
    <form action={action} aria-busy={pending} className="mt-4 space-y-4">
      <fieldset disabled={!enabled || pending} className="space-y-4"><legend className="sr-only">Pakartotinė patvirtinimo užklausa</legend>
        <label htmlFor="resend-email" className="block text-sm font-semibold">Paskyros el. paštas</label>
        <input id="resend-email" name="email" type="email" required maxLength={254} autoComplete="email" className="min-h-12 w-full border border-line bg-white/50 px-4 py-3" />
        <button className="min-h-12 border border-ink px-5 py-3 disabled:opacity-50">{pending ? "Siunčiama…" : "Siųsti patvirtinimo laišką"}</button>
      </fieldset>
      {state.error && <p role="alert" className="text-sm leading-7">{state.error}</p>}
      {state.message && <p role="status" className="text-sm leading-7">{state.message}</p>}
    </form>
  </details>;
}
