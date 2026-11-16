"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ArtworkRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button type="button" disabled={pending} aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="mt-7 min-h-12 border border-ink px-6 py-3 text-sm hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60">
      {pending ? "Bandoma dar kartą…" : "Bandyti dar kartą"}
    </button>
  );
}
