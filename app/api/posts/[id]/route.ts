import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id.trim();

  try {
    // 1. Fetch the egg post
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      console.error(`--- EGG NOT FOUND: ${id} ---`, error);
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }

    // 2. Handle files (signed URLs)
    if (post.files && Array.isArray(post.files) && post.files.length > 0) {
      const { data: signedUrls } = await supabaseAdmin.storage
        .from('egg-contents')
        .createSignedUrls(post.files, 3600);
      if (signedUrls) post.files = signedUrls.map(s => s.signedUrl);
    }

    // 3. Simultaneous logic - INDEPENDENT FETCH
    if (post.unlock_type === 'simultaneous') {
      // We fetch participants by post_id string directly, avoiding broken Foreign Key joins
      const { data: participants, error: pError } = await supabaseAdmin
        .from('egg_participants')
        .select('email, is_verified')
        .eq('post_id', id);

      if (pError) {
        console.error(`--- ERROR FETCHING PARTICIPANTS FOR ${id}:`, pError);
      }

      const dbParticipants = participants || [];
      console.log(`--- POLLING EGG: ${id}. Found ${dbParticipants.length} participants via Direct Query ---`);

      const authorizedEmails = (post.unlock_value || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.length > 0 && e.includes('@'));

      const processedParticipants = authorizedEmails.map((email: string) => {
        const p = dbParticipants.find(record => record.email.toLowerCase() === email);
        
        return {
          email: email,
          is_verified: p ? p.is_verified : false,
          is_active: false
        };
      });

      return NextResponse.json({ ...post, participants: processedParticipants });
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error(`API Error in GET /api/posts/${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
