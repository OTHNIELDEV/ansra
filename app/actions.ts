'use server';

import { createClient } from '@supabase/supabase-js';

export type LeadResult = { ok: true; demo: boolean } | { ok: false; message: string };

const clean = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

export async function submitLead(form: FormData): Promise<LeadResult> {
  const name = clean(form.get('name'));
  const phone = clean(form.get('phone'));
  const company = clean(form.get('company'));
  const role = clean(form.get('role')) || null;

  if (!name || name.length > 80) return { ok: false, message: '이름을 확인해 주세요.' };
  if (!/^[0-9+\-\s]{7,20}$/.test(phone)) return { ok: false, message: '연락처를 확인해 주세요.' };
  if (!company || company.length > 120) return { ok: false, message: '상호를 확인해 주세요.' };
  if (form.get('consent') !== 'on') return { ok: false, message: '개인정보 수집·이용 동의가 필요합니다.' };

  // Saving stays off until the privacy policy is published and LEADS_ENABLED is set to "true".
  if (process.env.LEADS_ENABLED !== 'true') return { ok: true, demo: true };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, message: '접수 설정이 완료되지 않았습니다.' };

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase
    .from('leads')
    .insert({ name, phone, company, role, consent_privacy_at: new Date().toISOString() });
  if (error) {
    console.error('lead insert failed', error.code);
    return { ok: false, message: '접수 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.' };
  }
  return { ok: true, demo: false };
}
