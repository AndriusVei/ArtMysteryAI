"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CollectionCategory, CollectionItem, CollectionRepository } from "@/types/collection";
import { collectionCategories, collectionErrorMessage, MAX_NOTE_LENGTH } from "@/lib/demo-collection";

export function CollectionCard({ item, repository, onRemoved }: {
  item: CollectionItem;
  repository: CollectionRepository;
  onRemoved: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState(item.category);
  const [notes, setNotes] = useState(item.notes);
  const [version, setVersion] = useState(item.updatedAt);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const busy = useRef(false);
  const removeButton = useRef<HTMLButtonElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const categoryField = useRef<HTMLSelectElement>(null);
  const cancelRemoveButton = useRef<HTMLButtonElement>(null);
  const fieldId = `collection-${item.artworkId}`;

  useEffect(() => { if (editing) categoryField.current?.focus(); }, [editing]);
  useEffect(() => { if (confirming) cancelRemoveButton.current?.focus(); }, [confirming]);

  function edit() {
    setCategory(item.category); setNotes(item.notes); setVersion(item.updatedAt);
    setMessage(null); setHasError(false); setEditing(true); setConfirming(false);
  }
  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true; setPending(true); setMessage(null); setHasError(false);
    try {
      await repository.update(item.artworkId, { category, notes }, version);
      setEditing(false); setMessage(repository.mode === "account" ? "Kategorija ir pastaba išsaugotos paskyroje." : "Kategorija ir pastaba išsaugotos šioje naršyklėje.");
      requestAnimationFrame(() => editButton.current?.focus());
    } catch (error) { setHasError(true); setMessage(collectionErrorMessage(error)); }
    finally { busy.current = false; setPending(false); }
  }
  async function remove() {
    if (busy.current) return;
    busy.current = true; setPending(true); setMessage(null); setHasError(false);
    try { await repository.remove(item.artworkId, version); onRemoved(item.title); }
    catch (error) { setHasError(true); setMessage(collectionErrorMessage(error)); }
    finally { busy.current = false; setPending(false); }
  }

  return (
    <article aria-labelledby={`${fieldId}-title`} className="min-w-0 break-words border border-line bg-white/35">
      <Link href={`/artwork/${item.artworkId}`} className="block bg-line/40" aria-label={`Atverti kūrinį „${item.title}“`}>
        {item.hasImage && !imageFailed ? <Image src={`/api/artworks/${item.artworkId}/image`} unoptimized
          width={600} height={450} alt={`${item.title}${item.artist ? ` – ${item.artist}` : ""}`}
          className="aspect-[4/3] h-auto w-full object-contain" onError={() => setImageFailed(true)} />
          : <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm text-muted">{imageFailed ? "Paveikslo šiuo metu nepavyko įkelti" : "Muziejaus paveikslas nepateiktas"}</div>}
      </Link>
      <div className="p-5 sm:p-6">
        <p className="eyebrow">{collectionCategories[item.category]}</p>
        <h2 id={`${fieldId}-title`} className="mt-3 break-words text-2xl leading-tight"><Link href={`/artwork/${item.artworkId}`} className="hover:underline">{item.title}</Link></h2>
        <p className="mt-3 break-words text-sm text-muted">{item.artist ?? "Autorius nenurodytas"}</p>
        {editing ? <form onSubmit={update} className="mt-6 space-y-4">
          <div>
            <label htmlFor={`${fieldId}-category`} className="mb-2 block text-sm font-semibold">Kategorija</label>
            <select ref={categoryField} id={`${fieldId}-category`} value={category} disabled={pending} onChange={(event) => setCategory(event.target.value as CollectionCategory)}
              className="min-h-12 w-full border border-line bg-paper px-3 py-2 text-sm">
              {Object.entries(collectionCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${fieldId}-notes`} className="mb-2 block text-sm font-semibold">Mano pastaba</label>
            <textarea id={`${fieldId}-notes`} value={notes} maxLength={MAX_NOTE_LENGTH} disabled={pending}
              onChange={(event) => setNotes(event.target.value)} rows={5} aria-describedby={`${fieldId}-limit`}
              className="w-full resize-y border border-line bg-paper px-3 py-3 text-sm leading-7" />
            <p id={`${fieldId}-limit`} className="mt-2 text-xs text-muted">{notes.length} / {MAX_NOTE_LENGTH} ženklų. Tuščia pastaba pašalina ankstesnį tekstą.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={pending || (category === item.category && notes === item.notes)} aria-busy={pending}
              className="min-h-12 bg-ink px-5 py-3 text-sm text-paper disabled:opacity-50">{pending ? "Išsaugoma…" : "Išsaugoti pakeitimus"}</button>
            <button type="button" disabled={pending} onClick={() => { setEditing(false); setMessage(null); requestAnimationFrame(() => editButton.current?.focus()); }} className="min-h-12 px-3 py-3 text-sm underline underline-offset-4">Atšaukti redagavimą</button>
          </div>
        </form> : <>
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Mano pastaba</h3>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{item.notes || "Pastabų dar nėra."}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" ref={editButton} onClick={edit} disabled={confirming || pending} className="min-h-12 border border-ink px-4 py-3 text-sm disabled:opacity-50">Redaguoti</button>
            <button type="button" ref={removeButton} disabled={pending} aria-expanded={confirming} aria-controls={`${fieldId}-remove`}
              onClick={() => { setVersion(item.updatedAt); setConfirming(true); setMessage(null); }} className="min-h-12 px-4 py-3 text-sm underline underline-offset-4">Pašalinti</button>
          </div>
        </>}
        {confirming && <div id={`${fieldId}-remove`} role="group" aria-label="Patvirtinti kūrinio pašalinimą" className="mt-5 border border-line bg-paper p-4">
          <p className="text-sm leading-7">Pašalinti šį kūrinį iš {repository.mode === "account" ? "paskyros" : "demonstracinės"} kolekcijos? Jo pastabos taip pat bus pašalintos.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={remove} disabled={pending} className="min-h-12 bg-ink px-4 py-3 text-sm text-paper disabled:opacity-50">{pending ? "Šalinama…" : "Taip, pašalinti"}</button>
            <button type="button" ref={cancelRemoveButton} disabled={pending} onClick={() => { setConfirming(false); setMessage(null); removeButton.current?.focus(); }} className="min-h-12 px-3 py-3 text-sm underline underline-offset-4">Atšaukti pašalinimą</button>
          </div>
        </div>}
        {message && <p role={hasError ? "alert" : "status"} className="mt-4 text-sm leading-7">{message}</p>}
      </div>
    </article>
  );
}
