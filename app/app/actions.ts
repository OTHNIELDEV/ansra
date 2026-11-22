'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { MOCK_MODEL, extractMentions, mockAdapter, type EngineAnswer, type Entity } from '../../lib/measure';
import { connectedEngines } from '../../lib/engines/real';
import { drain } from '../../lib/queue';
import { asKind, suggestPrompts } from '../../lib/prompts';

const MAX_PROMPTS = 20;     // runMeasurement reads at most this many
const MAX_COMPETITORS = 10;

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
    await supabase.from('prompts').insert(
      suggestPrompts(asKind(form.get('kind')), { brand: brandName, region, category: vertical })
        .map((p) => ({ workspace_id: ws, brand_id: brand.id, ...p })),
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

// Adds the starter questions for a business type, skipping ones the brand already has.
export async function addSuggestedPrompts(form: FormData) {
  const supabase = createClient();
  const { data: brand } = await supabase.from('brands').select('id,workspace_id,name,region').eq('id', text(form, 'brand_id', 40)).single();
  if (!brand) return fail('브랜드를 찾지 못했습니다.');
  const kind = asKind(form.get('kind'));
  const category = text(form, 'category', 60);
  if (kind === 'online' && category.length < 2) return fail('제품·서비스 분류를 입력해 주세요. 예: 상업용 부동산 매각 자료 작성 도구');
  const { data: existing } = await supabase.from('prompts').select('text').eq('brand_id', brand.id);
  const have = new Set((existing || []).map((p) => p.text));
  const room = MAX_PROMPTS - have.size;
  const fresh = suggestPrompts(kind, { brand: brand.name, region: brand.region, category }).filter((p) => !have.has(p.text)).slice(0, Math.max(room, 0));
  if (!fresh.length) return fail(room <= 0 ? `질문은 ${MAX_PROMPTS}개까지 등록할 수 있습니다.` : '추가할 새 질문이 없습니다.');
  const { error } = await supabase.from('prompts').insert(fresh.map((p) => ({ workspace_id: brand.workspace_id, brand_id: brand.id, ...p })));
  if (error) return fail('질문을 추가하지 못했습니다. 편집 권한이 있는지 확인해 주세요.');
  revalidatePath('/app');
  redirect('/app?m=' + encodeURIComponent(`질문 ${fresh.length}개를 추가했습니다. 맞지 않는 질문은 삭제해 주세요.`));
}

export async function addCompetitor(form: FormData) {
  const supabase = createClient();
  const { data: brand } = await supabase.from('brands').select('id,workspace_id,name').eq('id', text(form, 'brand_id', 40)).single();
  if (!brand) return fail('브랜드를 찾지 못했습니다.');
  const name = text(form, 'name', 80);
  if (name.length < 2) return fail('경쟁 브랜드 이름을 2자 이상 입력해 주세요.');
  const { data: existing } = await supabase.from('competitors').select('name').eq('brand_id', brand.id);
  const taken = [brand.name, ...(existing || []).map((c) => c.name)].map((n) => n.toLowerCase());
  if (taken.includes(name.toLowerCase())) return fail('이미 등록된 이름입니다.');
  if ((existing || []).length >= MAX_COMPETITORS) return fail(`경쟁 브랜드는 ${MAX_COMPETITORS}개까지 등록할 수 있습니다.`);
  const { error } = await supabase.from('competitors').insert({
    workspace_id: brand.workspace_id, brand_id: brand.id, name, aliases: list(form, 'aliases'), domain: text(form, 'domain', 120) || null,
  });
  if (error) return fail('경쟁 브랜드를 추가하지 못했습니다. 편집 권한이 있는지 확인해 주세요.');
  revalidatePath('/app');
}

export async function removeCompetitor(form: FormData) {
  const { error } = await createClient().from('competitors').delete().eq('id', text(form, 'id', 40));
  if (error) return fail('경쟁 브랜드를 삭제하지 못했습니다.');
  revalidatePath('/app');
}

export async function removePrompt(form: FormData) {
  const { error } = await createClient().from('prompts').delete().eq('id', text(form, 'id', 40));
  if (error) return fail('질문을 삭제하지 못했습니다.');
  revalidatePath('/app');
}

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

export async function setSchedule(form: FormData) {
  const { error } = await createClient().from('brands').update({ schedule: form.get('schedule') === 'daily' ? 'daily' : 'off' }).eq('id', text(form, 'brand_id', 40));
  if (error) return fail('자동 측정 설정을 저장하지 못했습니다.');
  revalidatePath('/app');
}

const waiting = async (supabase: Supa, ws: string) =>
  (await supabase.from('runs').select('id', { count: 'exact', head: true }).eq('workspace_id', ws).in('status', ['queued', 'running'])).count || 0;

// Measures the brand's active questions. With API keys configured it queues one run per question and connected engine
// and works off as many as fit in this request; the rest stay queued. With no keys it falls back to the mock engine.
export async function runMeasurement(form: FormData) {
  const supabase = createClient();
  const brandId = text(form, 'brand_id', 40);
  const { data: brand } = await supabase.from('brands').select('id,workspace_id,name,aliases,domain').eq('id', brandId).single();
  if (!brand) return fail('브랜드를 찾지 못했습니다.');
  const [{ data: rivals }, { data: prompts }, { data: engines }] = await Promise.all([
    supabase.from('competitors').select('id,name,aliases').eq('brand_id', brand.id),
    supabase.from('prompts').select('id,text,tier').eq('brand_id', brand.id).eq('active', true).order('created_at').limit(MAX_PROMPTS),
    supabase.from('engines').select('key').eq('enabled', true),
  ]);
  if (!prompts?.length) return fail('측정할 질문이 없습니다. 질문을 먼저 추가해 주세요.');
  const ws = brand.workspace_id;
  const connected = connectedEngines().filter((k) => (engines || []).some((e) => e.key === k));

  if (connected.length > 0) {
    await purgeMock(supabase, ws, brand.id);
    // Runs still waiting from an earlier click are finished first instead of queueing the same questions again.
    if ((await waiting(supabase, ws)) === 0) {
      const core = [...prompts].sort((a, b) => Number(b.tier === 'core') - Number(a.tier === 'core'));
      const { error } = await supabase.from('runs').insert(core.flatMap((p) => connected.map((engine) => ({ workspace_id: ws, prompt_id: p.id, engine_key: engine, status: 'queued' }))));
      if (error) return fail('측정을 시작하지 못했습니다. 편집 권한이 있는지 확인해 주세요.');
    }
    const out = await drain(supabase, { workspaceId: ws });
    if (out.denied) return fail('측정을 실행하지 못했습니다. 편집 권한이 있는지 확인해 주세요.');
    const left = await waiting(supabase, ws);
    revalidatePath('/app', 'layout');
    const failed = [...out.failures.values()].reduce((a, b) => a + b, 0);
    const detail = [...out.failures].map(([k, n]) => `${k} ${n}회`).join(', ');
    redirect('/app?m=' + encodeURIComponent(`실제 엔진 측정 ${out.done}회를 저장했습니다.` + (failed ? ` 실패 ${failed}회(${detail}).` : '')
      + (left ? ` 아직 ${left}회가 대기 중입니다. "남은 측정 이어서 실행"을 눌러 주세요.` : '')));
  }

  const own: Entity = { name: brand.name, aliases: brand.aliases || [], brandId: brand.id };
  const others: Entity[] = (rivals || []).map((c) => ({ name: c.name, aliases: c.aliases || [], competitorId: c.id }));
  const runs: object[] = [], answers: object[] = [], mentions: object[] = [], citations: object[] = [];
  let done = 0;
  const record = (promptId: string, engine: string, startedAt: string, out: EngineAnswer) => {
    const runId = randomUUID(), answerId = randomUUID(), finishedAt = new Date().toISOString();
    runs.push({ id: runId, workspace_id: ws, prompt_id: promptId, engine_key: engine, scheduled_at: startedAt, started_at: startedAt, finished_at: finishedAt, status: 'done', cost_krw: 0 });
    answers.push({ id: answerId, workspace_id: ws, run_id: runId, raw_text: out.text, model_version: out.modelVersion, captured_at: finishedAt });
    const known = [own, ...others, ...out.extraNames.map((name) => ({ name, aliases: [] as string[] }))];
    extractMentions(out.text, known).forEach((m) => mentions.push({
      workspace_id: ws, answer_id: answerId, brand_id: m.brandId ?? null, competitor_id: m.competitorId ?? null, name: m.name, position: m.position, snippet: m.snippet,
    }));
    out.citations.forEach((c, i) => citations.push({ workspace_id: ws, answer_id: answerId, url: c.url, domain: c.domain || new URL(c.url).hostname, is_owned: c.isOwned, rank: i + 1 }));
    done++;
  };
  const now = new Date().toISOString();
  for (const p of prompts) for (const e of engines || []) for (let s = 0; s < 3; s++) {
    record(p.id, e.key, now, await mockAdapter({ prompt: p.text, engine: e.key, sample: s, brand: { ...own, domain: brand.domain }, competitors: others }));
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
  redirect('/app?m=' + encodeURIComponent(`모의 측정 ${done}회를 실행했습니다.`));
}
