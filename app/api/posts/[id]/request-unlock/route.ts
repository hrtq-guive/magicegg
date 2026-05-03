import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendMagicLink } from '@/lib/email';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('--- REQUEST UNLOCK HIT ---', params.id);
  try {
    const eggId = params.id;

    // 1. Fetch the egg
    const { data: egg, error: eggError } = await supabase
      .from('posts')
      .select('unlock_type, unlock_value')
      .eq('id', eggId)
      .single();

    if (eggError || !egg) {
      return NextResponse.json({ error: `Egg not found: ${eggError?.message}` }, { status: 404 });
    }

    // 2. Validate emails
    const authorizedEmails = (egg.unlock_value || '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.length > 0 && e.includes('@')); // Only valid-looking emails
    
    if (authorizedEmails.length === 0) {
      return NextResponse.json({ error: 'No valid authorized emails found for this egg.' }, { status: 400 });
    }
    
    // 3. Generate tokens and send
    const results = await Promise.all(authorizedEmails.map(async (email: string) => {
      try {
        // Use a simple random string instead of the crypto library to avoid environment issues
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const { error: upsertError } = await supabase
          .from('egg_participants')
          .upsert({
            post_id: eggId,
            email: email,
            token: token,
            is_verified: false,
            last_active: new Date().toISOString()
          }, { onConflict: 'post_id,email' });

        if (upsertError) throw new Error(`DB: ${upsertError.message}`);

        const emailResult = await sendMagicLink(email, eggId, token);
        if (!emailResult.success) {
          throw new Error(`Email: ${JSON.stringify(emailResult.error)}`);
        }
        
        return { email, success: true };
      } catch (err: any) {
        return { email, success: false, error: err.message };
      }
    }));

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      return NextResponse.json({ 
        error: `Partial failure: ${failed[0].error}`,
        details: results 
      }, { status: 500 });
    }

    return NextResponse.json({ message: 'Success', count: authorizedEmails.length });
  } catch (error: any) {
    return NextResponse.json({ error: `Critical: ${error.message}` }, { status: 500 });
  }
}
