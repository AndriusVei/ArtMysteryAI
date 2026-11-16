-- Tik atskirai patvirtintos AI migracijos patikra pasirinktame projekte.
-- Visi laikini naudotojai, įrašai ir kvotų pakeitimai atšaukiami ROLLBACK.
-- Nekviečia Gemini, Auth el. pašto ar kitų išorinių paslaugų.
begin;
set local statement_timeout = '20s';
do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  request_a uuid := gen_random_uuid();
  request_b uuid := gen_random_uuid();
  row_a uuid := gen_random_uuid();
  row_b uuid := gen_random_uuid();
  ip text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  tick timestamptz := clock_timestamp();
  minute_key text := floor(extract(epoch from tick) / 60)::bigint::text;
  day_key text := floor(extract(epoch from tick) / 86400)::bigint::text;
  amount integer;
  denied boolean;
begin
  perform pg_advisory_xact_lock(74639251);
  insert into auth.users(id) values (user_a), (user_b);

  execute 'set local role anon';
  denied := false;
  begin perform public.reserve_ai_quota(ip, request_a);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL anon reserve'; end if;
  denied := false;
  begin perform public.release_ai_quota(request_a);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL anon release'; end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  denied := false;
  begin perform public.reserve_ai_quota(ip, request_a);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL missing identity'; end if;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  denied := false;
  begin perform 1 from public.ai_request_buckets;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL direct bucket read'; end if;
  denied := false;
  begin delete from public.ai_request_locks;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL direct lock deletion'; end if;
  denied := false;
  begin perform public.reserve_ai_quota('invalid-hash', request_a);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL invalid hash'; end if;

  if public.reserve_ai_quota(ip, request_a) <> 'allowed' then raise exception 'FAIL first reserve'; end if;
  if public.reserve_ai_quota(ip, request_b) <> 'busy' then raise exception 'FAIL active lease'; end if;
  perform public.release_ai_quota(request_b);
  if public.reserve_ai_quota(ip, request_b) <> 'busy' then raise exception 'FAIL wrong request release'; end if;

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  perform public.release_ai_quota(request_a);
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  if public.reserve_ai_quota(ip, request_b) <> 'busy' then raise exception 'FAIL foreign release'; end if;
  perform public.release_ai_quota(request_a);
  if public.reserve_ai_quota(ip, request_b) <> 'allowed' then raise exception 'FAIL second reserve'; end if;
  perform public.release_ai_quota(request_b);
  if public.reserve_ai_quota(ip, request_a) <> 'rate_limited' then raise exception 'FAIL user minute quota'; end if;

  execute 'reset role';
  update public.ai_request_buckets set used = 1 where bucket_key = 'u:'||user_a||':m:'||minute_key;
  update public.ai_request_buckets set used = 10 where bucket_key = 'u:'||user_a||':d:'||day_key;
  execute 'set local role authenticated';
  if public.reserve_ai_quota(ip, request_a) <> 'rate_limited' then raise exception 'FAIL user day quota'; end if;

  execute 'reset role';
  update public.ai_request_buckets set used = 5 where bucket_key = 'i:'||ip||':m:'||minute_key;
  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.reserve_ai_quota(ip, request_a) <> 'rate_limited' then raise exception 'FAIL IP minute quota'; end if;
  execute 'reset role';
  update public.ai_request_buckets set used = 1 where bucket_key = 'i:'||ip||':m:'||minute_key;
  update public.ai_request_buckets set used = 20 where bucket_key = 'i:'||ip||':d:'||day_key;
  execute 'set local role authenticated';
  if public.reserve_ai_quota(ip, request_a) <> 'rate_limited' then raise exception 'FAIL IP day quota'; end if;

  execute 'reset role';
  update public.ai_request_buckets set used = 1 where bucket_key = 'i:'||ip||':d:'||day_key;
  update public.ai_request_buckets set used = 20 where bucket_key = 'global:d:'||day_key;
  execute 'set local role authenticated';
  if public.reserve_ai_quota(ip, request_a) <> 'rate_limited' then raise exception 'FAIL global day quota'; end if;
  execute 'reset role';
  update public.ai_request_buckets set used = 1 where bucket_key = 'global:d:'||day_key;
  insert into public.ai_request_locks(user_id, request_id, lease_until) values (user_b, request_b, clock_timestamp() - interval '1 second');
  execute 'set local role authenticated';
  if public.reserve_ai_quota(ip, request_a) <> 'allowed' then raise exception 'FAIL expired lease'; end if;
  perform public.release_ai_quota(request_a);

  -- DB RLS tikrinimas; netikras {} turinys nėra modelio rezultato patikra.
  insert into public.ai_investigations(id, artwork_id, artwork_title, knowledge_level, investigation_mode, question_count, ai_result, request_key)
    values (row_b, 16568, 'Rollback test B', 'beginner', 'detective_mystery', 3, '{}', request_b);
  select count(*) into amount from public.ai_investigations where id = row_b;
  if amount <> 1 then raise exception 'FAIL own read'; end if;
  denied := false;
  begin insert into public.ai_investigations(artwork_id, artwork_title, knowledge_level, investigation_mode, question_count, ai_result, request_key)
    values (16568, 'Rollback duplicate', 'beginner', 'detective_mystery', 3, '{}', request_b);
  exception when unique_violation then denied := true; end;
  if not denied then raise exception 'FAIL idempotency unique index'; end if;
  denied := false;
  begin update public.ai_investigations set saved_at = now() where id = row_b;
  exception when check_violation then denied := true; end;
  if not denied then raise exception 'FAIL unsigned save'; end if;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  select count(*) into amount from public.ai_investigations where id = row_b;
  if amount <> 0 then raise exception 'FAIL foreign read'; end if;
  update public.ai_investigations set artwork_title = 'Forbidden' where id = row_b;
  get diagnostics amount = row_count;
  if amount <> 0 then raise exception 'FAIL foreign update'; end if;
  delete from public.ai_investigations where id = row_b;
  get diagnostics amount = row_count;
  if amount <> 0 then raise exception 'FAIL foreign delete'; end if;
  denied := false;
  begin insert into public.ai_investigations(user_id, artwork_id, artwork_title, knowledge_level, investigation_mode, question_count, ai_result)
    values (user_b, 16568, 'Forbidden owner', 'beginner', 'detective_mystery', 3, '{}');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL foreign insert'; end if;
  insert into public.ai_investigations(id, artwork_id, artwork_title, knowledge_level, investigation_mode, question_count, ai_result)
    values (row_a, 16568, 'Rollback test A', 'beginner', 'detective_mystery', 3, '{}');
  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  select count(*) into amount from public.ai_investigations where id = row_a;
  if amount <> 0 then raise exception 'FAIL reverse foreign read'; end if;
  delete from public.ai_investigations where id = row_b;
  get diagnostics amount = row_count;
  if amount <> 1 then raise exception 'FAIL own delete'; end if;
  execute 'reset role';
  if floor(extract(epoch from clock_timestamp()) / 60)::bigint::text <> minute_key then raise exception 'RETRY: minute boundary'; end if;
end;
$$;
rollback;
select 'PASS: quota, lease, RLS and constraint assertions; all test changes rolled back; Gemini not called' as result;
