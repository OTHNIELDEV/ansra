import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

// Email confirmation links land here with a one-time code.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/app', request.url));
  }
  return NextResponse.redirect(new URL('/login?m=' + encodeURIComponent('인증 링크가 만료되었거나 올바르지 않습니다.'), request.url));
}
