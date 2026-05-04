import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eggId = params.id;
    const { email, token } = await request.json();

    if (!email || !token) return NextResponse.json({ error: 'Email and token required' }, { status: 400 });

    const { error, count } = await supabaseAdmin
      .from('egg_participants')
      .update({ last_active: new Date().toISOString() }, { count: 'exact' })
      .eq('post_id', eggId)
      .eq('email', email.toLowerCase())
      .eq('token', token);

    if (error) throw error;
    return NextResponse.json({ success: true, updated: count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
