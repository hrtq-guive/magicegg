import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  try {
    // 1. Fetch the egg using Admin client to be safe
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

    // 3. Simultaneous logic
    if (post.unlock_type === 'simultaneous') {
      console.log(`--- POLLING EGG: ${id} (Internal ID: ${post.id}) ---`);
      
      const { data: participants, error: pError } = await supabaseAdmin
        .from('egg_participants')
        .select('email, is_verified')
        .eq('post_id', post.id);

      if (pError) {
        console.error(`--- ERROR FETCHING PARTICIPANTS:`, pError);
      }

      console.log(`--- DB RAW PARTICIPANTS for ${id}:`, JSON.stringify(participants));

      const authorizedEmails = (post.unlock_value || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.length > 0 && e.includes('@'));

      const processedParticipants = authorizedEmails.map((email: string) => {
        const p = (participants || []).find((record: any) => record.email.toLowerCase() === email);
        
        const status = {
          email: email,
          is_verified: p ? p.is_verified : false,
          is_active: false
        };
        
        console.log(`--- STATUS for ${email}: verified=${status.is_verified} (Found in DB: ${!!p}) ---`);
        return status;
      });

      return NextResponse.json({ ...post, participants: processedParticipants });
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error(`API Error in GET /api/posts/${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
