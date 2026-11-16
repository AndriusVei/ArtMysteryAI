-- Naujas 4 etapo DB pakeitimas. Tik po atskiro patvirtinimo tikram projektui.
begin;
alter table public.ai_investigations
  add column saved_at timestamptz,
  add column model text check (model is null or char_length(model) between 1 and 100),
  add column request_key uuid,
  add column generation_signature text check (generation_signature is null or generation_signature ~ '^[a-f0-9]{64}$'),
  add constraint ai_saved_signature_check check (saved_at is null or (generation_signature is not null and model is not null));
create unique index ai_investigations_request_key on public.ai_investigations(user_id, request_key) where request_key is not null;
create index ai_investigations_saved_idx on public.ai_investigations(user_id, saved_at desc) where saved_at is not null;

create table public.ai_request_buckets (
  bucket_key text primary key check (char_length(bucket_key) <= 150),
  used integer not null check (used > 0),
  expires_at timestamptz not null
);
create table public.ai_request_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  request_id uuid not null,
  lease_until timestamptz not null
);
alter table public.ai_request_buckets enable row level security;
alter table public.ai_request_locks enable row level security;
revoke all on public.ai_request_buckets, public.ai_request_locks from public, anon, authenticated;

create function public.reserve_ai_quota(ip_hash text, request_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  tick timestamptz := clock_timestamp();
  minute_key text := floor(extract(epoch from tick) / 60)::bigint::text;
  day_key text := floor(extract(epoch from tick) / 86400)::bigint::text;
  keys text[];
  limits integer[] := array[2, 10, 5, 20, 20];
  n integer;
begin
  if owner is null or ip_hash is null or ip_hash !~ '^[a-f0-9]{64}$' or request_id is null then raise exception 'Not authorized' using errcode = '42501'; end if;
  -- Trumpas bendras užraktas užtikrina atomines kvotas tarp serverio instancijų.
  perform pg_advisory_xact_lock(74639251);
  delete from public.ai_request_buckets where expires_at < tick;
  delete from public.ai_request_locks where lease_until < tick;
  if exists (select 1 from public.ai_request_locks l where l.user_id = owner) then return 'busy'; end if;
  keys := array['u:'||owner||':m:'||minute_key, 'u:'||owner||':d:'||day_key,
    'i:'||ip_hash||':m:'||minute_key, 'i:'||ip_hash||':d:'||day_key, 'global:d:'||day_key];
  for n in 1..5 loop
    if coalesce((select b.used from public.ai_request_buckets b where b.bucket_key = keys[n]), 0) >= limits[n] then return 'rate_limited'; end if;
  end loop;
  for n in 1..5 loop
    insert into public.ai_request_buckets(bucket_key, used, expires_at) values (keys[n], 1, tick + interval '2 days')
    on conflict (bucket_key) do update set used = public.ai_request_buckets.used + 1;
  end loop;
  insert into public.ai_request_locks(user_id, request_id, lease_until) values (owner, request_id, tick + interval '90 seconds');
  return 'allowed';
end;
$$;
create function public.release_ai_quota(request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not authorized' using errcode = '42501'; end if;
  delete from public.ai_request_locks l where l.user_id = auth.uid() and l.request_id = release_ai_quota.request_id;
end;
$$;
revoke all on function public.reserve_ai_quota(text, uuid), public.release_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.reserve_ai_quota(text, uuid), public.release_ai_quota(uuid) to authenticated;
commit;
