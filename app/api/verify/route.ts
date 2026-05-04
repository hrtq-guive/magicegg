import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = decodeURIComponent(searchParams.get('token') ?? '').trim();
  const eggId = searchParams.get('id') ?? '';

  if (!token || !eggId) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });

  try {
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 'https://magicegg.heretique.fr';

    // 1. Mark as verified and return the email in one step
    const { data: updated, error } = await supabaseAdmin
      .from('egg_keys')
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq('token', token)
      .eq('post_id', eggId)
      .select('email, token')
      .single();

    if (error || !updated) {
      // If update fails, check if already verified (idempotency)
      const { data: existing } = await supabaseAdmin
        .from('egg_keys')
        .select('email, token, is_verified')
        .eq('token', token)
        .single();
      
      if (existing?.is_verified) {
        return NextResponse.redirect(`${origin}/${eggId}?verified=true&email=${encodeURIComponent(existing.email)}&token=${existing.token}`);
      }
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 });
    }

    return NextResponse.redirect(`${origin}/${eggId}?verified=true&email=${encodeURIComponent(updated.email)}&token=${updated.token}`);
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
