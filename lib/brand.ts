import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

export type Brand = { id: string; workspace_id: string; name: string; region: string | null; vertical: string | null; domain: string | null; schedule: 'off' | 'daily' };

// Signed-in user plus their first brand. Sub-pages pass requireBrand to send new users to registration.
export async function getContext(requireBrand = false) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const { data: brands } = await supabase.from('brands').select('id,workspace_id,name,region,vertical,domain,schedule').order('created_at').limit(1);
  const brand = (brands?.[0] as Brand | undefined) || null;
  if (requireBrand && !brand) redirect('/app');
  return { supabase, user: auth.user!, brand };
}
