// Measurement building blocks: engine adapters and mention extraction.

export type Entity = { name: string; aliases: string[]; brandId?: string; competitorId?: string };
export type Mention = { name: string; position: number; snippet: string; brandId?: string; competitorId?: string };
export type EngineAnswer = { text: string; citations: { url: string; isOwned: boolean }[]; modelVersion: string; extraNames: string[] };
export type EngineAdapter = (input: { prompt: string; engine: string; sample: number; brand: Entity & { domain?: string | null }; competitors: Entity[] }) => Promise<EngineAnswer>;

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ENGINE_BIAS: Record<string, number> = { chatgpt: 0.45, gemini: 0.38, perplexity: 0.5, claude: 0.35, naver_ai: 0.25, google_aio: 0.3 };
const FILLERS = ['지역 업체 가', '지역 업체 나', '지역 업체 다'];

// Mock engine: produces made-up answers so the pipeline can be exercised without API keys.
// Its numbers say nothing about real AI search visibility.
export const mockAdapter: EngineAdapter = async ({ prompt, engine, sample, brand, competitors }) => {
  const rnd = seeded(`${prompt}|${engine}|${sample}|${Date.now()}`);
  const picked: string[] = [];
  if (rnd() < (ENGINE_BIAS[engine] ?? 0.35)) picked.push(brand.name);
  competitors.forEach((c) => { if (rnd() < 0.5) picked.push(c.name); });
  FILLERS.forEach((f) => { if (rnd() < 0.45) picked.push(f); });
  if (picked.length === 0) picked.push(FILLERS[0]);
  picked.sort(() => rnd() - 0.5);
  const text = `[모의 답변] "${prompt}" 질문에 대해 다음 순서로 소개합니다. ` + picked.map((n, i) => `${i + 1}) ${n}`).join(' ') + '.';
  const citations: EngineAnswer['citations'] = [{ url: 'https://example.com/mock-review', isOwned: false }];
  if (picked.includes(brand.name) && brand.domain && rnd() < 0.6) citations.push({ url: `https://${brand.domain.replace(/^https?:\/\//, '')}/`, isOwned: true });
  return { text, citations, modelVersion: 'mock-v1', extraNames: FILLERS };
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/[㈜()]/g, '');

// Finds which known names appear in an answer and in what order.
export function extractMentions(text: string, entities: Entity[]): Mention[] {
  const hay = norm(text);
  const found: { e: Entity; at: number }[] = [];
  for (const e of entities) {
    let at = -1;
    for (const label of [e.name, ...e.aliases]) {
      const key = norm(label);
      if (!key) continue;
      const i = hay.indexOf(key);
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    if (at >= 0) found.push({ e, at });
  }
  found.sort((a, b) => a.at - b.at);
  return found.map((f, i) => ({ name: f.e.name, position: i + 1, snippet: f.e.name.slice(0, 20), brandId: f.e.brandId, competitorId: f.e.competitorId }));
}
