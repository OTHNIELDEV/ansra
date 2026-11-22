// Starter questions by business type. A local business is found by "area + category";
// an online product or B2B service is found by category alone, compared with alternatives, and asked about by name.
export type BrandKind = 'local' | 'online';
export type Suggested = { text: string; tier: 'core' | 'standard'; intent: string };

export const BRAND_KINDS: { key: BrandKind; label: string }[] = [
  { key: 'local', label: '지역 매장·업소 (병원, 중개사무소, 식당 등)' },
  { key: 'online', label: '온라인 서비스·B2B (소프트웨어, 플랫폼, 컨설팅 등)' },
];

export const asKind = (v: unknown): BrandKind => (v === 'online' ? 'online' : 'local');

export function suggestPrompts(kind: BrandKind, b: { brand: string; region?: string | null; category?: string | null }): Suggested[] {
  const category = (b.category || '').trim();
  if (kind === 'online') {
    const named: Suggested[] = [
      { text: `${b.brand} 어때? 장단점 알려 줘`, tier: 'standard', intent: '평판' },
      { text: `${b.brand} 대신 쓸 만한 서비스 있어?`, tier: 'standard', intent: '대안' },
    ];
    if (!category) return named;
    return [
      { text: `${category} 추천해 줘`, tier: 'core', intent: '추천' },
      { text: `${category} 비교해 줘`, tier: 'core', intent: '비교' },
      { text: `${category} 고를 때 기준이 뭐야?`, tier: 'standard', intent: '정보' },
      { text: `${category} 가격은 어느 정도야?`, tier: 'standard', intent: '가격' },
      ...named,
    ];
  }
  const head = [b.region, category].filter(Boolean).join(' ') || b.brand;
  return [
    { text: `${head} 추천해 줘`, tier: 'core', intent: '추천' },
    { text: `${head} 비용은 어느 정도야?`, tier: 'standard', intent: '가격' },
    { text: `${category || b.brand} 고를 때 기준이 뭐야?`, tier: 'standard', intent: '정보' },
  ];
}
