'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { MOCK_MODEL, extractMentions, mockAdapter, type EngineAnswer, type Entity } from '../../lib/measure';
import { EngineError, connectedEngines, realAdapter } from '../../lib/engines/real';

const text = (form: FormData, key: string, max: number) => String(form.get(key) || '').trim().slice(0, max);
const list = (form: FormData, key: string) => text(form, key, 400).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
const fail = (msg: string) => redirect('/app?m=' + encodeURIComponent(msg));

export async function signOut() {
  await createClient().auth.signOut();
  redirect('/login');
}

export async function createWorkspace(form: FormData) {
  const supabase = createClient();
  const brandName = text(form, 'brand', 80);
  if (!brandName) return fail('브랜드 이름을 입력해 주세요.');
  const region = text(form, 'region', 40) || null;
  const vertical = text(form, 'vertical', 40) || null;
  const { data: ws, error } = await supabase.rpc('create_workspace', {
    ws_name: text(form, 'workspace', 80) || brandName, brand_name: brandName, brand_aliases: list(form, 'aliases'),
    brand_domain: text(form, 'domain', 120) || null, brand_region: region, brand_vertical: vertical,
  });
  if (error || !ws) return fail('워크스페이스를 만들지 못했습니다.');
  const { data: brand } = await supabase.from('brands').select('id').eq('workspace_id', ws).single();
  if (brand) {
    const rivals = list(form, 'competitors').map((name) => ({ workspace_id: ws, brand_id: brand.id, name }));
    if (rivals.length) await supabase.from('competitors').insert(rivals);
    const head = [region, vertical].filter(Boolean).join(' ') || brandName;
    await supabase.from('prompts').insert(
      [`${head} 추천해 줘`, `${head} 비용은 어느 정도야?`, `${vertical || brandName} 고를 때 기준이 뭐야?`]
        .map((t, i) => ({ workspace_id: ws, brand_id: brand.id, text: t, tier: i === 0 ? 'core' : 'standard', intent: ['추천', '가격', '정보'][i] })),
    );
  }
  revalidatePath('/app');
}

export async function addPrompt(form: FormData) {
  const supabase = createClient();
  const value = text(form, 'text', 200);
  if (value.length < 4) return fail('질문을 4자 이상 입력해 주세요.');
  const { error } = await supabase.from('prompts').insert({
    workspace_id: text(form, 'workspace_id', 40), brand_id: text(form, 'brand_id', 40), text: value,
    tier: form.get('tier') === 'core' ? 'core' : 'standard',
  });
  if (error) return fail('질문을 추가하지 못했습니다. 편집 권한이 있는지 확인해 주세요.');
  revalidatePath('/app');
}

export async function removePrompt(form: FormData) {
  const { error } = await createClient().from('prompts').delete().eq('id', text(form, 'id', 40));
  if (error) return fail('질문을 삭제하지 못했습니다.');
  revalidatePath('/app');
}

const REAL_PROMPTS = 4;        // questions per manual run when real engines are connected (core questions first)
const REAL_CONCURRENCY = 6;
const REAL_BUDGET_MS = 45_000; // stop starting new calls after this; the request itself is capped at 60s

type Supa = ReturnType<typeof createClient>;

// Mock answers are worthless once a real engine is connected, and would blend into its numbers. Remove them once.
async function purgeMock(supabase: Supa, ws: string, brandId: string) {
  let removed = 0;
  for (let round = 0; round < 50; round++) {
    const { data } = await supabase.from('answers').select('run_id').eq('workspace_id', ws).eq('model_version', MOCK_MODEL).limit(100);
    if (!data?.length) break;
    const { error } = await supabase.from('runs').delete().in('id', data.map((r) => r.run_id));
    if (error) break;
    removed += data.length;
  }
  if (!removed) return 0;
  await supabase.from('metrics_daily').delete().eq('brand_id', brandId);
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() + 9 * 3600 * 1000 - i * 86400 * 1000).toISOString().slice(0, 10));
  await Promise.all(days.map((d) => supabase.rpc('refresh_metrics', { target_brand: brandId, target_day: d })));
  return removed;
}

// Measures the brand's active questions. With API keys configured it calls only the connected engines;
// with none it falls back to the mock engine for every enabled engine.
export async function runMeasurement(form: FormData) {
  const supabase = createClient();
  const brandId = text(form, 'brand_id', 40);
  const { data: brand } = await supabase.from('brands').select('id,workspace_id,name,aliases,domain').eq('id', brandId).single();
  if (!brand) return fail('브랜드를 찾지 못했습니다.');
  const [{ data: rivals }, { data: prompts }, { data: engines }] = await Promise.all([
    supabase.from('competitors').select('id,name,aliases').eq('brand_id', brand.id),
    supabase.from('prompts').select('id,text,tier').eq('brand_id', brand.id).eq('active', true).order('created_at').limit(20),
    supabase.from('engines').select('key').eq('enabled', true),
  ]);
  if (!prompts?.length) return fail('측정할 질문이 없습니다. 질문을 먼저 추가해 주세요.');

  const own: Entity = { name: brand.name, aliases: brand.aliases || [], brandId: brand.id };
  const others: Entity[] = (rivals || []).map((c) => ({ name: c.name, aliases: c.aliases || [], competitorId: c.id }));
  const ws = brand.workspace_id;
  const runs: object[] = [], answers: object[] = [], mentions: object[] = [], citations: object[] = [];
  const connected = connectedEngines().filter((k) => (engines || []).some((e) => e.key === k));
  const real = connected.length > 0;
  const failures = new Map<string, number>();
  let done = 0, skipped = 0;

  const record = (promptId: string, engine: string, startedAt: string, out: EngineAnswer) => {
    const runId = randomUUID(), answerId = randomUUID(), finishedAt = new Date().toISOString();
    runs.push({ id: runId, workspace_id: ws, prompt_id: promptId, engine_key: engine, scheduled_at: startedAt, started_at: startedAt, finished_at: finishedAt, status: 'done', cost_krw: real ? null : 0 });
    answers.push({ id: answerId, workspace_id: ws, run_id: runId, raw_text: out.text, model_version: out.modelVersion, captured_at: finishedAt });
    const known = [own, ...others, ...out.extraNames.map((name) => ({ name, aliases: [] as string[] }))];
    extractMentions(out.text, known).forEach((m) => mentions.push({
      workspace_id: ws, answer_id: answerId, brand_id: m.brandId ?? null, competitor_id: m.competitorId ?? null, name: m.name, position: m.position, snippet: m.snippet,
    }));
    out.citations.forEach((c, i) => citations.push({ workspace_id: ws, answer_id: answerId, url: c.url, domain: c.domain || new URL(c.url).hostname, is_owned: c.isOwned, rank: i + 1 }));
    done++;
  };
  const input = (prompt: string, engine: string, sample: number) => ({ prompt, engine, sample, brand: { ...own, domain: brand.domain }, competitors: others });

  if (real) {
    await purgeMock(supabase, ws, brand.id);
    const picked = [...prompts].sort((a, b) => Number(b.tier === 'core') - Number(a.tier === 'core')).slice(0, REAL_PROMPTS);
    const queue = picked.flatMap((p) => connected.map((engine) => ({ p, engine })));
    const startedAll = Date.now();
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const startedAt = new Date().toISOString();
        const base = { id: randomUUID(), workspace_id: ws, prompt_id: job.p.id, engine_key: job.engine, scheduled_at: startedAt };
        if (Date.now() - startedAll > REAL_BUDGET_MS) { runs.push({ ...base, status: 'skipped', error_code: 'time_budget' }); skipped++; continue; }
        try {
          record(job.p.id, job.engine, startedAt, await realAdapter(job.engine)!(input(job.p.text, job.engine, 0)));
        } catch (e) {
          const code = e instanceof EngineError ? e.code : 'unknown';
          runs.push({ ...base, started_at: startedAt, finished_at: new Date().toISOString(), status: 'failed', error_code: code });
          failures.set(`${job.engine}:${code}`, (failures.get(`${job.engine}:${code}`) || 0) + 1);
        }
      }
    };
    await Promise.all(Array.from({ length: REAL_CONCURRENCY }, worker));
  } else {
    const now = new Date().toISOString();
    for (const p of prompts) for (const e of engines || []) for (let s = 0; s < 3; s++) record(p.id, e.key, now, await mockAdapter(input(p.text, e.key, s)));
  }

  for (const [table, rows] of [['runs', runs], ['answers', answers], ['mentions', mentions], ['citations', citations]] as const) {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from(table).insert(rows.slice(i, i + 500));
      if (error) return fail('측정 결과를 저장하지 못했습니다. 편집 권한이 있는지 확인해 주세요.');
    }
  }
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const { error } = await supabase.rpc('refresh_metrics', { target_brand: brand.id, target_day: day });
  if (error) return fail('집계하지 못했습니다.');
  revalidatePath('/app', 'layout');
  const failed = [...failures.values()].reduce((a, b) => a + b, 0);
  const detail = [...failures].map(([k, n]) => `${k} ${n}회`).join(', ');
  redirect('/app?m=' + encodeURIComponent(real
    ? `실제 엔진 측정 ${done}회를 저장했습니다.` + (failed ? ` 실패 ${failed}회(${detail}).` : '') + (skipped ? ` 시간 제한으로 ${skipped}회는 건너뛰었습니다.` : '')
    : `모의 측정 ${done}회를 실행했습니다.`));
}
