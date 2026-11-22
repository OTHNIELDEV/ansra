// Rule-based first pass over a draft. It only flags wording patterns; it is not a legal review.
export const RULEPACK = { name: 'general-ad-ko', version: '0.1.0' } as const;

export type Finding = { level: 'block' | 'warn'; rule: string; match: string; advice: string };
export type Verdict = 'pass' | 'warn' | 'block';

const RULES: { level: Finding['level']; rule: string; re: RegExp; advice: string }[] = [
  { level: 'block', rule: '단정 표현', re: /(전혀\s*없|100\s*%|백\s*퍼센트|무조건|반드시\s*(낫|성공|해결)|완치|확실히\s*보장|보장합니다)/g, advice: '결과를 단정하지 말고, 근거가 있는 범위로 표현해 주세요.' },
  { level: 'block', rule: '후기 형태 서술', re: /(고객\s*후기|이용\s*후기|치료\s*후기|체험담|받아\s*보니|해\s*보니\s*정말)/g, advice: '후기 대신 절차나 기준을 설명하는 문장으로 바꿔 주세요.' },
  { level: 'warn', rule: '최상급 표현', re: /(최고|최초|유일|1\s*위|으뜸|독보적|No\.?\s*1)/gi, advice: '객관적 근거와 출처가 없다면 빼는 편이 안전합니다.' },
  { level: 'warn', rule: '타 업체 비교', re: /(타\s*업체|다른\s*(곳|업체|병원|회사)보다|경쟁사보다)/g, advice: '직접 비교 대신 자체 기준을 설명해 주세요.' },
  { level: 'warn', rule: '가격 유인', re: /(파격\s*할인|최저가|무료\s*시술|공짜)/g, advice: '가격 조건과 기간을 정확히 적거나 표현을 완화해 주세요.' },
];

export function review(text: string): { verdict: Verdict; findings: Finding[] } {
  const findings: Finding[] = [];
  for (const r of RULES) {
    const seen = new Set<string>();
    for (const m of text.matchAll(r.re)) {
      const match = m[0].replace(/\s+/g, ' ');
      if (seen.has(match)) continue;
      seen.add(match);
      findings.push({ level: r.level, rule: r.rule, match, advice: r.advice });
    }
  }
  const verdict: Verdict = findings.some((f) => f.level === 'block') ? 'block' : findings.length ? 'warn' : 'pass';
  return { verdict, findings };
}
