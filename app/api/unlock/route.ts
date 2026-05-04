import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMagicLink } from '@/lib/email';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  
  if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

  try {
    const { data: egg, error: eggError } = await supabaseAdmin.from('posts').select('unlock_value').eq('id', id).single();
    
    if (eggError || !egg) {
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }
    
    const emails = (egg.unlock_value || '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.includes('@'));

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No participants found' }, { status: 400 });
    }

    const results = await Promise.all(emails.map(async (email: string) => {
      const token = Math.random().toString(36).substring(2, 15);
      
      const { error: upsertError } = await supabaseAdmin.from('egg_participants').upsert({
        post_id: id,
        email: email,
        token: token,
        is_verified: false,
        last_active: new Date().toISOString()
      }, { onConflict: 'post_id,email' });

      if (upsertError) {
        console.error(`Upsert error for ${email}:`, upsertError);
        return { email, success: false, error: upsertError };
      }

      const { success, error } = await sendMagicLink(email, id, token);
      return { email, success, error };
    }));

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      return NextResponse.json({ error: 'Failed to send some keys', details: failed }, { status: 500 });
    }

    return NextResponse.json({ message: 'Keys sent successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
