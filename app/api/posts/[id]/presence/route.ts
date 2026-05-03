import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { email } = await request.json();
    const eggId = params.id;

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const { error } = await supabase
      .from('egg_participants')
      .update({ last_active: new Date().toISOString() })
      .eq('post_id', eggId)
      .eq('email', email.toLowerCase())
      .eq('is_verified', true);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
