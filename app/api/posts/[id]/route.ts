import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Trim the ID from the URL to be safe
  const id = params.id.trim();

  try {
    // 1. Fetch the egg AND its participants in ONE JOIN QUERY
    // This is much more robust than two separate queries.
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('*, egg_participants(email, is_verified)')
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

    // 3. Simultaneous logic
    if (post.unlock_type === 'simultaneous') {
      // Use the participants returned from the join
      const dbParticipants = (post.egg_participants || []) as any[];
      
      console.log(`--- POLLING EGG: ${id}. Found ${dbParticipants.length} participants in Join Query ---`);

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

      // Clean up the response to avoid nested data
      const responsePost = { ...post };
      delete responsePost.egg_participants;

      return NextResponse.json({ ...responsePost, participants: processedParticipants });
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error(`API Error in GET /api/posts/${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
