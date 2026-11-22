// Shared inline styles and small helpers for the signed-in screens.
export const card = { background: '#fff', border: '1px solid #E4E7EB', borderRadius: 14, padding: 20 } as const;
export const field = { padding: 12, border: '1px solid #C5CAD2', borderRadius: 10, fontSize: 15, minWidth: 0 } as const;
export const label = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 } as const;
export const primary = { minHeight: 44, padding: '0 18px', background: '#2B3FE0', color: '#fff', border: 0, borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' } as const;
export const ghost = { minHeight: 44, padding: '0 14px', background: '#fff', color: '#111418', border: '1px solid #C5CAD2', borderRadius: 10, fontSize: 14, cursor: 'pointer' } as const;
export const muted = { fontSize: 14, color: '#5B6470', lineHeight: 1.6, margin: 0 } as const;
export const th = { textAlign: 'left', padding: '10px 12px', fontSize: 13, color: '#5B6470', fontWeight: 500, borderBottom: '1px solid #E4E7EB', whiteSpace: 'nowrap' } as const;
export const td = { padding: '12px', fontSize: 14, borderBottom: '1px solid #EEF0F2', verticalAlign: 'top' } as const;
export const numeric = { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 } as const;

export const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) + '%' : '—');
export const daysAgo = (n: number) => new Date(Date.now() - n * 86400 * 1000).toISOString();
export const kst = (iso: string) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
