import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMagicLink } from '@/lib/email';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

  console.log(`--- UNLOCK REQUEST FOR EGG: ${id} ---`);

  try {
    // 1. Health check for Admin Client
    const { count: healthCheck, error: healthError } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (healthError) {
      console.error('--- ADMIN CLIENT HEALTH CHECK FAILED:', healthError);
      return NextResponse.json({ error: `Admin Client Error: ${healthError.message}` }, { status: 500 });
    }
    console.log('--- ADMIN CLIENT HEALTHY ---');

    // 2. Fetch Egg
    const { data: egg, error: eggError } = await supabaseAdmin.from('posts').select('unlock_value').eq('id', id).single();
    if (eggError || !egg) {
      console.error(`--- EGG NOT FOUND: ${id} ---`, eggError);
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }

    const emails = egg.unlock_value.split(',').map((e: string) => e.trim().toLowerCase()).filter((e: string) => e.includes('@'));
    console.log(`--- PREPARING TO SEND TO ${emails.length} EMAILS ---`);

    const results = await Promise.all(emails.map(async (email: string) => {
      const token = Math.random().toString(36).substring(2, 15);
      
      // 3. Reliable Delete-then-Insert (instead of finicky Upsert)
      await supabaseAdmin.from('egg_participants').delete().eq('post_id', id).eq('email', email);
      
      const { error: insertError } = await supabaseAdmin.from('egg_participants').insert({
        post_id: id,
        email: email,
        token: token,
        is_verified: false,
        last_active: new Date().toISOString()
      });

      if (insertError) {
        console.error(`--- DB INSERT ERROR FOR ${email}:`, insertError);
        return { email, success: false, error: insertError };
      }

      console.log(`--- DB SUCCESS: Saved ${email}. Sending email... ---`);
      const { success, error } = await sendMagicLink(email, id, token);

      return { email, success, error };
    }));

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      const errorMsg = failed[0].error?.message || 'Unknown error';
      return NextResponse.json({ error: `Process Error: ${errorMsg}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'Success', count: results.length });
  } catch (err: any) {
    console.error(`--- UNEXPECTED UNLOCK ERROR:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
