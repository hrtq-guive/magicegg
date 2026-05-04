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
    // Use a random query parameter to force Supabase to bypass any internal caches
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*, egg_participants(email, is_verified)')
      .eq('id', id)
      .neq('id', `cache-bust-${Math.random()}`) // Use a dummy filter to bust the cache safely
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }

    // 2. Define strict headers to kill any potential caching at the CDN level
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
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
        
        return {
          email: email,
          is_verified: p ? !!p.is_verified : false
        };
      });

      // DEBUG: Return raw counts to the client so we can see what's happening
      return NextResponse.json({ 
        ...post, 
        participants,
        _debug: {
          db_count: participants_data.length,
          verified_in_db: participants_data.filter((p: any) => p.is_verified).length,
          authorized_count: authorizedEmails.length
        }
      }, { headers });
    }

    return NextResponse.json(post, { headers });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
