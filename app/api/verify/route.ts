import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const eggId = searchParams.get('id');
  const emailParam = searchParams.get('email');

  console.log(`--- VERIFY ATTEMPT: egg=${eggId}, email=${emailParam}, token=${token?.substring(0, 5)}... ---`);

  if (!eggId) {
    return NextResponse.json({ error: 'Missing egg ID' }, { status: 400 });
  }

  try {
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 'https://magicegg.heretique.fr';

    // 1. Try to find by token first
    let participant;
    if (token) {
      const { data } = await supabaseAdmin
        .from('egg_participants')
        .select('id, email, is_verified, token')
        .eq('token', token)
        .eq('post_id', eggId)
        .single();
      participant = data;
    }

    // 2. If token lookup failed, try email lookup if provided (handles "already verified" case)
    if (!participant && emailParam) {
      const { data } = await supabaseAdmin
        .from('egg_participants')
        .select('id, email, is_verified, token')
        .eq('email', emailParam.toLowerCase())
        .eq('post_id', eggId)
        .single();
      
      // ONLY allow this if they are already verified
      if (data?.is_verified) {
        participant = data;
        console.log(`--- ALREADY VERIFIED: egg=${eggId}, email=${emailParam} ---`);
      }
    }

    if (!participant) {
      console.error(`--- VERIFICATION FAILED: egg=${eggId}, token=${token}, email=${emailParam} ---`);
      return NextResponse.json({ error: 'Invalid or expired link. Please request a new key.' }, { status: 403 });
    }

    // 3. Mark as verified if not already
    if (!participant.is_verified) {
      const { error: updateError } = await supabaseAdmin
        .from('egg_participants')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString()
          // NOTE: We no longer clear the token; it acts as a session key
        })
        .eq('id', participant.id);

      if (updateError) {
        console.error('Verification update error:', updateError);
        return NextResponse.json({ error: 'Failed to verify participant' }, { status: 500 });
      }
    }

    // 4. Redirect back to the egg page with email AND token for session management
    return NextResponse.redirect(`${origin}/${eggId}?verified=true&email=${encodeURIComponent(participant.email)}&token=${participant.token}`);
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
