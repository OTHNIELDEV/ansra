// Works off waiting measurement runs: claim one, call the engine, report the result. Used by the "측정 실행" button
// (signed-in editor, own workspace) and by /api/worker (scheduled, proves itself with the worker secret).
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractMentions, type Entity } from './measure';
import { EngineError, connectedEngines, realAdapter } from './engines/real';

const CONCURRENCY = 6;
// New calls start only within this window. An engine call may take 40s and the request is capped at 60s.
export const CLAIM_WINDOW_MS = 18_000;

type Job = {
  run_id: string; engine: string; prompt: string;
  brand: { id: string; name: string; aliases: string[] | null; domain: string | null };
  competitors: { id: string; name: string; aliases: string[] | null }[];
};
export type DrainResult = { done: number; failures: Map<string, number>; denied: boolean };

export async function drain(supabase: SupabaseClient, who: { secret?: string; workspaceId?: string }): Promise<DrainResult> {
  const engines = connectedEngines();
  const out: DrainResult = { done: 0, failures: new Map(), denied: false };
  if (!engines.length) return out;
  const secret = who.secret || '';
  const started = Date.now();
  const worker = async () => {
    while (Date.now() - started < CLAIM_WINDOW_MS && !out.denied) {
      const { data, error } = await supabase.rpc('claim_run', { worker_secret: secret, engine_keys: engines, target_ws: who.workspaceId ?? null });
      if (error) { out.denied = true; return; }
      const job = data as Job | null;
      if (!job) return;
      let result: Record<string, unknown>;
      try {
        const own: Entity = { name: job.brand.name, aliases: job.brand.aliases || [], brandId: job.brand.id };
        const others: Entity[] = job.competitors.map((c) => ({ name: c.name, aliases: c.aliases || [], competitorId: c.id }));
        const adapter = realAdapter(job.engine);
        if (!adapter) throw new EngineError('not_connected');
        const ans = await adapter({ prompt: job.prompt, engine: job.engine, sample: 0, brand: { ...own, domain: job.brand.domain }, competitors: others });
        result = {
          status: 'done', text: ans.text, model_version: ans.modelVersion,
          mentions: extractMentions(ans.text, [own, ...others]).map((m) => ({ brand_id: m.brandId ?? null, competitor_id: m.competitorId ?? null, name: m.name, position: m.position, snippet: m.snippet })),
          citations: ans.citations.map((c, i) => ({ url: c.url, domain: c.domain || hostOf(c.url), is_owned: c.isOwned, rank: i + 1 })),
        };
        out.done++;
      } catch (e) {
        const code = e instanceof EngineError ? e.code : 'unknown';
        result = { status: 'failed', error_code: code };
        const key = `${job.engine}:${code}`;
        out.failures.set(key, (out.failures.get(key) || 0) + 1);
      }
      await supabase.rpc('complete_run', { worker_secret: secret, target_run: job.run_id, result });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out;
}

function hostOf(url: string) { try { return new URL(url).hostname; } catch { return null; } }
