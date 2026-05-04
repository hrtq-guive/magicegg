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
    // 1. Fetch the egg
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }

    // 2. Define strict CDN-killing headers (Fix 1)
    const headers = {
      'CDN-Cache-Control': 'no-store',
      'Netlify-CDN-Cache-Control': 'no-store',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Surrogate-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    // 3. Handle files (signed URLs)
    if (post.files && Array.isArray(post.files) && post.files.length > 0) {
      const { data: signedUrls } = await supabaseAdmin.storage
        .from('egg-contents')
        .createSignedUrls(post.files, 3600);
      if (signedUrls) post.files = signedUrls.map(s => s.signedUrl);
    }

    // 4. For Simultaneous eggs, fetch their keys/participants
    if (post.unlock_type === 'simultaneous') {
      const { data: participants_data } = await supabaseAdmin
        .from('egg_participants')
        .select('email, is_verified, last_active')
        .eq('post_id', id);

      // Force headers to be even more aggressive (Fix for Netlify caching)
      const headers = {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Response-Time': new Date().toISOString()
      };

      const authorizedEmails = (post.unlock_value || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.length > 0 && e.includes('@'));

      const participants = authorizedEmails.map((email: string) => {
        const p = (participants_data || []).find(p => p.email.toLowerCase() === email);
        const is_active = p && p.last_active ? (Date.now() - new Date(p.last_active).getTime() < 15000) : false;
        
        return {
          email: email,
          is_verified: p ? !!p.is_verified : false,
          is_active: is_active
        };
      });

      return NextResponse.json({ ...post, participants }, { headers });
    }

    return NextResponse.json(post, { headers });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
