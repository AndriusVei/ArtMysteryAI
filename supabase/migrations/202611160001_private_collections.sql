-- Vykdyti tik atskirai patvirtinus tikros bazės pakeitimą ir atkūrimo planą.
-- Pradinė migracija: jei lentelės jau egzistuoja, sustoti ir palyginti schemas.
begin;

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  knowledge_level text not null default 'beginner' check (knowledge_level in ('child', 'beginner', 'expert')),
  created_at timestamptz not null default now()
);

create table public.saved_artworks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  artwork_id integer not null check (artwork_id between 1 and 999999999),
  title text not null check (char_length(btrim(title)) between 1 and 2000),
  artist text check (artist is null or char_length(artist) between 1 and 2000),
  has_image boolean not null default false,
  image_url text,
  category text not null default 'favorites' check (category in ('favorites', 'to_explore', 'explored')),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint saved_artworks_user_artwork_key unique (user_id, artwork_id),
  constraint saved_artworks_image_check check (
    (not has_image and image_url is null) or
    (has_image and image_url is not null and image_url = '/api/artworks/' || artwork_id::text || '/image')
  )
);
create index saved_artworks_owner_created_idx on public.saved_artworks(user_id, created_at desc);

create function public.touch_saved_artwork() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  new.created_at = old.created_at;
  return new;
end;
$$;
revoke all on function public.touch_saved_artwork() from public, anon, authenticated;
create trigger saved_artworks_touch before update on public.saved_artworks
for each row execute function public.touch_saved_artwork();

-- AI generavimas ir šios lentelės adapteris jungiami tik 4 etape.
create table public.ai_investigations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  artwork_id integer not null check (artwork_id between 1 and 999999999),
  artwork_title text not null check (char_length(btrim(artwork_title)) between 1 and 2000),
  knowledge_level text not null check (knowledge_level in ('child', 'beginner', 'expert')),
  investigation_mode text not null check (investigation_mode in ('detective_mystery', 'historical_storytelling', 'symbolism_analysis')),
  question_count integer not null check (question_count in (3, 5)),
  user_prompt text not null default '' check (char_length(user_prompt) <= 1000),
  ai_result jsonb not null check (jsonb_typeof(ai_result) = 'object' and octet_length(ai_result::text) <= 128000),
  created_at timestamptz not null default now()
);
create index ai_investigations_owner_created_idx on public.ai_investigations(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.saved_artworks enable row level security;
alter table public.ai_investigations enable row level security;

revoke all on public.profiles, public.saved_artworks, public.ai_investigations from public, anon, authenticated;
grant select, insert, update, delete on public.profiles, public.saved_artworks, public.ai_investigations to authenticated;

create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy saved_artworks_select on public.saved_artworks for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_artworks_insert on public.saved_artworks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_artworks_update on public.saved_artworks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy saved_artworks_delete on public.saved_artworks for delete to authenticated using ((select auth.uid()) = user_id);

create policy ai_investigations_select on public.ai_investigations for select to authenticated using ((select auth.uid()) = user_id);
create policy ai_investigations_insert on public.ai_investigations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ai_investigations_update on public.ai_investigations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ai_investigations_delete on public.ai_investigations for delete to authenticated using ((select auth.uid()) = user_id);

commit;
