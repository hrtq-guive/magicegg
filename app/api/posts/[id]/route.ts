import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id.trim();

  // Rule Out post_id Encoding Issue (Fix 4)
  console.log('post_id raw:', JSON.stringify(id));
  console.log('post_id length:', id.length);
  console.log('post_id charCodes:', id.split('').map(c => c.charCodeAt(0)));

  try {
    // 1. Fetch the egg and its participants in ONE single joined query
    // This is much more robust than two separate queries
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*, egg_participants(email, is_verified, last_active)')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }

    // 2. Define strict headers to kill any potential caching
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    };

    // 3. Handle files (signed URLs)
    if (post.files && Array.isArray(post.files) && post.files.length > 0) {
      const { data: signedUrls } = await supabaseAdmin.storage
        .from('egg-contents')
        .createSignedUrls(post.files, 3600);
      if (signedUrls) post.files = signedUrls.map(s => s.signedUrl);
    }

    // 4. For Simultaneous eggs, format the participants
    if (post.unlock_type === 'simultaneous') {
      const authorizedEmails = (post.unlock_value || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.length > 0 && e.includes('@'));

      const participants_data = post.egg_participants || [];

      const participants = authorizedEmails.map((email: string) => {
        const p = participants_data.find((p: any) => p.email.toLowerCase() === email);
        const is_active = p && p.last_active ? (Date.now() - new Date(p.last_active).getTime() < 15000) : false;
        
        return {
          email: email,
          is_verified: p ? !!p.is_verified : false,
          is_active: is_active
        };
      });

      // Remove the raw joined data before sending to client
      delete post.egg_participants;
      return NextResponse.json({ ...post, participants }, { headers });
    }

    return NextResponse.json(post, { headers });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
