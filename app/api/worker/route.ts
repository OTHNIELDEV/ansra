// Scheduled measurement worker. Called by the database scheduler (pg_cron) with the worker secret as a bearer token.
// The secret is checked by the database functions themselves; this route holds no key that bypasses row-level security.
import { createClient } from '@supabase/supabase-js';
import { connectedEngines } from '../../../lib/engines/real';
import { drain } from '../../../lib/queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (secret.length < 32) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  let queued = 0;
  if (new URL(request.url).searchParams.get('task') === 'schedule') {
    const { data, error } = await supabase.rpc('enqueue_scheduled', { worker_secret: secret, engine_keys: connectedEngines() });
    if (error) return Response.json({ error: 'unauthorized' }, { status: 401 });
    queued = data || 0;
  }
  const out = await drain(supabase, { secret });
  if (out.denied) return Response.json({ error: 'unauthorized' }, { status: 401 });
  return Response.json({ queued, done: out.done, failed: [...out.failures.values()].reduce((a, b) => a + b, 0) });
}
