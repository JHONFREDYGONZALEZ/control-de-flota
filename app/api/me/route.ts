import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ id: null }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ id: user.id }, { headers: { 'Cache-Control': 'no-store' } });
}
