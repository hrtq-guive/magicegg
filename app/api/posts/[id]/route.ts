import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Ultra-robust ID cleaning
  const rawId = params.id;
  const decodedId = decodeURIComponent(rawId).trim();
  
  console.log(`--- POLLING START: raw="${rawId}", decoded="${decodedId}" ---`);

  try {
    // 1. Fetch the egg post
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .ilike('id', decodedId)
      .single();

    if (postError || !post) {
      console.error(`--- EGG NOT FOUND: ${decodedId} ---`, postError);
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }

    // 2. Handle files (signed URLs)
    if (post.files && Array.isArray(post.files) && post.files.length > 0) {
      const { data: signedUrls } = await supabaseAdmin.storage
        .from('egg-contents')
        .createSignedUrls(post.files, 3600);
      if (signedUrls) post.files = signedUrls.map(s => s.signedUrl);
    }

    // 3. Simultaneous logic - ULTRA AGGRESSIVE FETCH
    if (post.unlock_type === 'simultaneous') {
      // Use BOTH the decoded ID and the ID from the database record
      const searchId = post.id || decodedId;
      
      const { data: participants, error: pError } = await supabaseAdmin
        .from('egg_participants')
        .select('*') // Select all to avoid column mismatch
        .ilike('post_id', searchId);

      if (pError) {
        console.error(`--- ERROR FETCHING PARTICIPANTS FOR ${searchId}:`, pError);
      }

      const dbParticipants = participants || [];
      console.log(`--- POLLING SUCCESS: ${searchId}. Found ${dbParticipants.length} participants (Query: ilike '${searchId}') ---`);

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
    console.error(`API Error in GET /api/posts/${decodedId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
