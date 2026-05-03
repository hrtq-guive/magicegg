import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

  try {
    const { data: egg, error: eggError } = await supabase.from('posts').select('unlock_value').eq('id', id).single();
    if (eggError || !egg) return NextResponse.json({ error: 'Egg not found' }, { status: 404 });

    const emails = egg.unlock_value.split(',').map((e: string) => e.trim().toLowerCase()).filter(e => e.includes('@'));
    const apiKey = process.env.RESEND_API_KEY;
    const resend = new Resend(apiKey);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const results = await Promise.all(emails.map(async (email) => {
      const token = Math.random().toString(36).substring(2, 15);
      await supabase.from('egg_participants').upsert({
        post_id: id,
        email: email,
        token: token,
        is_verified: false,
        last_active: new Date().toISOString()
      }, { onConflict: 'post_id,email' });

      const { data, error } = await resend.emails.send({
        from: 'Chaosbox <onboarding@resend.dev>', // Resend trial default
        to: [email],
        subject: 'Unlock your Chaosbox Egg',
        html: `<p>Your magic link: <a href="${baseUrl}/api/verify?token=${token}&id=${id}">Click here to verify</a></p>`
      });

      return { email, success: !error, error };
    }));

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      // Return the specific error from Resend
      const errorMsg = failed[0].error?.message || JSON.stringify(failed[0].error);
      return NextResponse.json({ error: `Resend Error: ${errorMsg}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'Success', count: results.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
