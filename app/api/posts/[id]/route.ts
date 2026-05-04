import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id.trim();

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

    // 2. Handle files (signed URLs)
    if (post.files && Array.isArray(post.files) && post.files.length > 0) {
      const { data: signedUrls } = await supabaseAdmin.storage
        .from('egg-contents')
        .createSignedUrls(post.files, 3600);
      if (signedUrls) post.files = signedUrls.map(s => s.signedUrl);
    }

    // 3. For Simultaneous eggs, fetch their keys
    if (post.unlock_type === 'simultaneous') {
      const { data: keys } = await supabaseAdmin
        .from('egg_keys')
        .select('email, is_verified')
        .eq('post_id', id);

      const authorizedEmails = (post.unlock_value || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.length > 0 && e.includes('@'));

      const participants = authorizedEmails.map((email: string) => {
        const k = (keys || []).find(key => key.email.toLowerCase() === email);
        return {
          email: email,
          is_verified: k ? k.is_verified : false
        };
      });

      return NextResponse.json({ ...post, participants });
    }

    return NextResponse.json(post);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
