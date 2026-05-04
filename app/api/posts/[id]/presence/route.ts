import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eggId = params.id;
    console.log(`--- PRESENCE HEARTBEAT ATTEMPT: egg=${eggId} ---`);
    
    const body = await request.json();
    const { email, token } = body;
    console.log(`--- PRESENCE DATA: email=${email}, token=${token?.substring(0, 5)}... ---`);

    if (!email || !token) return NextResponse.json({ error: 'Email and token required' }, { status: 400 });

    const { error, count } = await supabaseAdmin
      .from('egg_participants')
      .update({ last_active: new Date().toISOString() }, { count: 'exact' })
      .eq('post_id', eggId)
      .eq('email', email.toLowerCase())
      .eq('token', token);

    console.log(`--- HEARTBEAT RESULT: egg=${eggId}, email=${email}, updated=${count || 0} rows ---`);

    if (error) throw error;
    return NextResponse.json({ success: true, updated: count });
  } catch (error: any) {
    console.error(`--- HEARTBEAT ERROR:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
