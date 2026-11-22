'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

function read(form: FormData) {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: '이메일 주소를 확인해 주세요.' as const };
  if (password.length < 10) return { error: '비밀번호는 10자 이상으로 입력해 주세요.' as const };
  return { email, password };
}
const back = (msg: string) => redirect('/login?m=' + encodeURIComponent(msg));

export async function signIn(form: FormData) {
  const v = read(form);
  if ('error' in v) return back(v.error!);
  const { error } = await createClient().auth.signInWithPassword({ email: v.email, password: v.password });
  if (error) return back('로그인하지 못했습니다. 이메일 인증을 마쳤는지, 비밀번호가 맞는지 확인해 주세요.');
  redirect('/app');
}

export async function signUp(form: FormData) {
  const v = read(form);
  if ('error' in v) return back(v.error!);
  const origin = headers().get('origin') || '';
  const { error } = await createClient().auth.signUp({
    email: v.email, password: v.password, options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return back('가입하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  back('확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.');
}
