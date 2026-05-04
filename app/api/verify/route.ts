import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Hardened decoding and trimming
  const token = decodeURIComponent(searchParams.get('token') ?? '').trim();
  const eggId = searchParams.get('id') ?? '';
  const emailParam = decodeURIComponent(searchParams.get('email') ?? '').trim();

  console.log(`--- HARDENED VERIFY ATTEMPT: egg=${eggId}, email=${emailParam}, token=${token.substring(0, 5)}... ---`);

  if (!eggId) {
    return NextResponse.json({ error: 'Missing egg ID' }, { status: 400 });
  }

  // Check for Service Role Key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('--- CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY IS NOT SET IN ENV ---');
  }

  try {
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 'https://magicegg.heretique.fr';

    // Step 1: Find the participant first — confirms token exists before updating
    const { data: participant, error: lookupError } = await supabaseAdmin
      .from('egg_participants')
      .select('id, email, is_verified, token')
      .eq('token', token)
      .eq('post_id', eggId)
      .single();

    if (lookupError || !participant) {
      console.error('--- TOKEN LOOKUP FAILED:', { eggId, token, lookupError });
      
      // Fallback: Check if they are already verified via email (idempotency)
      if (emailParam) {
        const { data: alreadyVerified } = await supabaseAdmin
          .from('egg_participants')
          .select('id, email, is_verified, token')
          .eq('email', emailParam.toLowerCase())
          .eq('post_id', eggId)
          .single();
        
        if (alreadyVerified?.is_verified) {
          console.log(`--- ALREADY VERIFIED (Fallback): egg=${eggId}, email=${emailParam} ---`);
          return NextResponse.redirect(`${origin}/${eggId}?verified=true&email=${encodeURIComponent(alreadyVerified.email)}&token=${alreadyVerified.token}`);
        }
      }

      return NextResponse.json({ error: 'Invalid or expired link. Please request a new key.' }, { status: 403 });
    }

    // Step 2: Already verified — just redirect
    if (participant.is_verified) {
      console.log(`--- ALREADY VERIFIED: egg=${eggId}, email=${participant.email} ---`);
      return NextResponse.redirect(`${origin}/${eggId}?verified=true&email=${encodeURIComponent(participant.email)}&token=${participant.token}`);
    }

    // Step 3: Perform the update, selecting back to confirm
    console.log(`--- UPDATING VERIFICATION: id=${participant.id} ---`);
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('egg_participants')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      })
      .eq('id', participant.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('--- UPDATE FAILED:', { updateError, updated });
      return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 });
    }

    console.log(`--- VERIFICATION SUCCESS: email=${updated.email} ---`);

    // Step 4: Redirect back to the egg page
    return NextResponse.redirect(`${origin}/${eggId}?verified=true&email=${encodeURIComponent(updated.email)}&token=${updated.token}`);
  } catch (error: any) {
    console.error('--- UNEXPECTED VERIFICATION ERROR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
