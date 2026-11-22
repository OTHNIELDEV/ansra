-- Tenant isolation + pipeline check. Everything runs inside one block that always ends by
-- raising "RESULT: ...", so nothing it creates is kept.
-- Expected: metrics=1/1 a_cites=1/owned a_opp=1/1 a_content=1 b_brands=1 b_answers=0 b_metrics=0 b_insert=blocked b_update=0 b_delete=0 b_ranking=0
--           b_cites=0 b_opps=0 b_contents=0 b_reviews=0 b_content_insert=blocked anon_brands=0
--           a_claim=ok a_done=1 b_claim=blocked b_own=none b_complete=blocked b_enqueue=blocked anon_claim=blocked
do $$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  wa uuid; wb uuid; ba uuid; pa uuid; ra uuid := gen_random_uuid(); aa uuid := gen_random_uuid();
  ca uuid := gen_random_uuid(); n int; s int; t text; res text := '';
  q1 uuid := gen_random_uuid(); q2 uuid := gen_random_uuid(); j jsonb;
begin
  insert into auth.users(id, instance_id, aud, role, email) values
    (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'iso-a@test.invalid'),
    (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'iso-b@test.invalid');

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  wa := public.create_workspace('A', '브랜드A');
  select id into ba from public.brands where workspace_id = wa;
  insert into public.prompts(workspace_id, brand_id, text) values (wa, ba, '질문A') returning id into pa;
  insert into public.runs(id, workspace_id, prompt_id, engine_key, status) values (ra, wa, pa, 'chatgpt', 'done');
  insert into public.answers(id, workspace_id, run_id, raw_text) values (aa, wa, ra, '테스트 답변');
  insert into public.mentions(workspace_id, answer_id, brand_id, name, position) values (wa, aa, ba, '브랜드A', 2);
  insert into public.citations(workspace_id, answer_id, url, is_owned) values (wa, aa, 'https://a.test/', true);
  perform public.refresh_metrics(ba, (now() at time zone 'Asia/Seoul')::date);
  select mention_n, sample_n into n, s from public.metrics_daily where brand_id = ba;
  res := res || format('metrics=%s/%s', n, s);
  select citations, case when is_owned then 'owned' else 'external' end into n, t from public.citation_domains(ba, now() - interval '1 day');
  res := res || format(' a_cites=%s/%s', n, t);
  select mention_n, sample_n into n, s from public.prompt_opportunities(ba, now() - interval '1 day');
  res := res || format(' a_opp=%s/%s', n, s);
  insert into public.contents(id, workspace_id, brand_id, prompt_id, title, body_md, status) values (ca, wa, ba, pa, '초안A', '본문A', 'in_review');
  insert into public.compliance_reviews(workspace_id, content_id, rulepack, rulepack_version, verdict) values (wa, ca, 'general-ad-ko', '0.1.0', 'pass');
  select count(*) into n from public.contents; res := res || ' a_content=' || n;

  insert into public.runs(id, workspace_id, prompt_id, engine_key, status, scheduled_at) values
    (q1, wa, pa, 'chatgpt', 'queued', now() - interval '1 minute'), (q2, wa, pa, 'chatgpt', 'queued', now());
  j := public.claim_run('', array['chatgpt'], wa);
  res := res || ' a_claim=' || case when (j->>'run_id')::uuid = q1 and j->'brand'->>'name' = '브랜드A' then 'ok' else 'WRONG' end;
  perform public.complete_run('', q1, jsonb_build_object('status', 'done', 'text', '큐 답변', 'model_version', 't',
    'mentions', jsonb_build_array(jsonb_build_object('brand_id', ba, 'name', '브랜드A', 'position', 1))));
  select count(*) into n from public.answers an join public.runs r on r.id = an.run_id where r.id = q1 and r.status = 'done';
  res := res || ' a_done=' || n;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  wb := public.create_workspace('B', '브랜드B');
  select count(*) into n from public.brands;        res := res || ' b_brands=' || n;
  select count(*) into n from public.answers;       res := res || ' b_answers=' || n;
  select count(*) into n from public.metrics_daily; res := res || ' b_metrics=' || n;
  begin
    insert into public.prompts(workspace_id, brand_id, text) values (wa, ba, '침입');
    res := res || ' b_insert=ALLOWED';
  exception when others then res := res || ' b_insert=blocked';
  end;
  update public.brands set name = '변조' where id = ba; get diagnostics n = row_count; res := res || ' b_update=' || n;
  delete from public.prompts where id = pa;            get diagnostics n = row_count; res := res || ' b_delete=' || n;
  select count(*) into n from public.brand_ranking(ba, now() - interval '1 day'); res := res || ' b_ranking=' || n;

  select count(*) into n from public.citation_domains(ba, now() - interval '1 day');     res := res || ' b_cites=' || n;
  select count(*) into n from public.prompt_opportunities(ba, now() - interval '1 day'); res := res || ' b_opps=' || n;
  select count(*) into n from public.contents;           res := res || ' b_contents=' || n;
  select count(*) into n from public.compliance_reviews; res := res || ' b_reviews=' || n;
  begin
    insert into public.contents(workspace_id, brand_id, title) values (wa, ba, '침입');
    res := res || ' b_content_insert=ALLOWED';
  exception when others then res := res || ' b_content_insert=blocked';
  end;

  begin j := public.claim_run('', array['chatgpt'], wa); res := res || ' b_claim=ALLOWED';
  exception when others then res := res || ' b_claim=blocked'; end;
  j := public.claim_run('', array['chatgpt'], wb); res := res || ' b_own=' || coalesce(j->>'run_id', 'none');
  begin perform public.complete_run('', q2, '{"status":"done","text":"침입"}'::jsonb); res := res || ' b_complete=ALLOWED';
  exception when others then res := res || ' b_complete=blocked'; end;
  begin perform public.enqueue_scheduled('', array['chatgpt']); res := res || ' b_enqueue=ALLOWED';
  exception when others then res := res || ' b_enqueue=blocked'; end;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  select count(*) into n from public.brands; res := res || ' anon_brands=' || n;
  begin j := public.claim_run('', array['chatgpt'], wa); res := res || ' anon_claim=ALLOWED';
  exception when others then res := res || ' anon_claim=blocked'; end;

  raise exception 'RESULT: %', res;
end $$;
