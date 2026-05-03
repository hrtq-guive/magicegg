import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const eggId = searchParams.get('id');

  if (!token || !eggId) {
    return NextResponse.json({ error: 'Missing token or egg ID' }, { status: 400 });
  }

  try {
    // 1. Check if token exists and belongs to the egg
    const { data: participant, error: findError } = await supabaseAdmin
      .from('egg_participants')
      .select('id, email')
      .eq('token', token)
      .eq('post_id', eggId)
      .single();

    if (findError || !participant) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    // 2. Mark as verified
    const { error: updateError } = await supabaseAdmin
      .from('egg_participants')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        token: null // Clear token after use for security
      })
      .eq('id', participant.id);

    if (updateError) {
      console.error('Verification update error:', updateError);
      return NextResponse.json({ error: 'Failed to verify participant' }, { status: 500 });
    }

    // 3. Redirect back to the egg page
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 'https://eggbox.netlify.app';
    return NextResponse.redirect(`${origin}/${eggId}?verified=true&email=${encodeURIComponent(participant.email)}`);
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
