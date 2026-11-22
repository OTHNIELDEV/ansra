// Real engine adapters. Each one asks the provider's API with its web search tool switched on,
// then returns the answer text and the pages it cited. Keys are read from server-side env only.
import type { EngineAdapter, EngineAnswer } from '../measure';

type Cited = { url: string; title?: string };
type Parsed = { text: string; cited: Cited[]; model?: string };
type Json = any; // provider payloads; every access below is guarded

const TIMEOUT_MS = 40_000;

export class EngineError extends Error {
  constructor(public code: string) { super(code); }
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<Json> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  } catch (e) {
    throw new EngineError((e as Error)?.name === 'TimeoutError' ? 'timeout' : 'network');
  }
  if (!res.ok) throw new EngineError('http_' + res.status);
  try { return await res.json(); } catch { throw new EngineError('bad_json'); }
}

// ---- response parsers (exported for tests) ----
export function parseOpenAI(j: Json): Parsed {
  const parts = (j?.output || []).filter((o: Json) => o?.type === 'message').flatMap((o: Json) => o?.content || []).filter((c: Json) => typeof c?.text === 'string');
  return {
    text: parts.map((c: Json) => c.text).join('\n').trim(),
    cited: parts.flatMap((c: Json) => c.annotations || []).filter((a: Json) => a?.type === 'url_citation' && a.url).map((a: Json) => ({ url: a.url, title: a.title })),
    model: j?.model,
  };
}

export function parseGemini(j: Json): Parsed {
  const parts = (j?.steps || []).filter((s: Json) => s?.type === 'model_output').flatMap((s: Json) => s?.content || []).filter((c: Json) => typeof c?.text === 'string');
  return {
    text: parts.map((c: Json) => c.text).join('\n').trim(),
    cited: parts.flatMap((c: Json) => c.annotations || []).filter((a: Json) => a?.type === 'url_citation' && a.url).map((a: Json) => ({ url: a.url, title: a.title })),
    model: j?.model,
  };
}

export function parseAnthropic(j: Json): Parsed {
  const parts = (j?.content || []).filter((c: Json) => c?.type === 'text' && typeof c.text === 'string');
  return {
    text: parts.map((c: Json) => c.text).join('').trim(),
    cited: parts.flatMap((c: Json) => c.citations || []).filter((a: Json) => a?.url).map((a: Json) => ({ url: a.url, title: a.title })),
    model: j?.model,
  };
}

// ---- citations ----
const bare = (d: string) => d.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
const DOMAIN = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

// Some providers hand back a redirect link and put the real site name in the title; prefer the title then.
export function citedDomain(c: Cited): string | null {
  let host = '';
  try { host = bare(new URL(c.url).hostname); } catch { return null; }
  const title = (c.title || '').trim();
  if (/vertexaisearch|googleusercontent|grounding-api-redirect/.test(c.url) && DOMAIN.test(title)) return bare(title);
  return host;
}

function finish(p: Parsed, fallbackModel: string, ownDomain?: string | null): EngineAnswer {
  if (!p.text) throw new EngineError('empty');
  const own = ownDomain ? bare(ownDomain) : '';
  const seen = new Set<string>();
  const citations: EngineAnswer['citations'] = [];
  for (const c of p.cited) {
    const domain = citedDomain(c);
    if (!domain || seen.has(c.url)) continue;
    seen.add(c.url);
    citations.push({ url: c.url.slice(0, 2000), domain, isOwned: !!own && (domain === own || domain.endsWith('.' + own)) });
    if (citations.length >= 20) break;
  }
  return { text: p.text.slice(0, 20000), citations, modelVersion: (p.model || fallbackModel).slice(0, 80), extraNames: [] };
}

const KR = { type: 'approximate', country: 'KR', timezone: 'Asia/Seoul' };

const openai: EngineAdapter = async ({ prompt, brand }) => {
  const model = process.env.OPENAI_MODEL || 'gpt-6.2-astra';
  const j = await post('https://api.openai.com/v1/responses', { authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
    { model, input: prompt, tools: [{ type: 'web_search', user_location: KR }] });
  return finish(parseOpenAI(j), model, brand.domain);
};

const gemini: EngineAdapter = async ({ prompt, brand }) => {
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const j = await post('https://generativelanguage.googleapis.com/v1beta/interactions', { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    { model, input: prompt, tools: [{ type: 'google_search' }] });
  return finish(parseGemini(j), model, brand.domain);
};

const anthropic: EngineAdapter = async ({ prompt, brand }) => {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  const j = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    { model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }], tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3, user_location: KR }] });
  return finish(parseAnthropic(j), model, brand.domain);
};

const REAL: Record<string, { env: string; adapter: EngineAdapter }> = {
  chatgpt: { env: 'OPENAI_API_KEY', adapter: openai },
  gemini: { env: 'GEMINI_API_KEY', adapter: gemini },
  claude: { env: 'ANTHROPIC_API_KEY', adapter: anthropic },
};

// Engine keys that have an API key configured on this deployment.
export const connectedEngines = () => Object.keys(REAL).filter((k) => !!process.env[REAL[k].env]);
export const realAdapter = (engine: string): EngineAdapter | null => (process.env[REAL[engine]?.env] ? REAL[engine].adapter : null);
