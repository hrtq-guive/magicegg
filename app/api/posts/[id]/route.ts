import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const nowTime = new Date().toISOString();
  console.log(`--- GET /api/posts/${id} started at ${nowTime} ---`);

  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }

    // Generate signed URLs for private files
    if (post.files && Array.isArray(post.files) && post.files.length > 0) {
      const { data: signedUrls, error: signedError } = await supabaseAdmin.storage
        .from('egg-contents')
        .createSignedUrls(post.files, 3600); // 1 hour
      
      if (!signedError && signedUrls) {
        post.files = signedUrls.map(s => s.signedUrl);
      }
    } else if (typeof post.files === 'string' && post.files.startsWith('[')) {
      // Handle stringified array if necessary
      const filePaths = JSON.parse(post.files);
      const { data: signedUrls, error: signedError } = await supabaseAdmin.storage
        .from('egg-contents')
        .createSignedUrls(filePaths, 3600);
      
      if (!signedError && signedUrls) {
        post.files = signedUrls.map(s => s.signedUrl);
      }
    }

    if (post.unlock_type === 'simultaneous') {
      const { data: participants, error: pError } = await supabaseAdmin
        .from('egg_participants')
        .select('email, is_verified, last_active')
        .eq('post_id', post.id);

      if (pError) {
        console.error(`--- ERROR FETCHING PARTICIPANTS FOR ${id}:`, pError);
      } else {
        console.log(`--- FETCHED ${participants?.length || 0} PARTICIPANTS FOR ${id} ---`);
      }

      const authorizedEmails = (post.unlock_value || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.length > 0 && e.includes('@'));

      const now = new Date();
      
      // Map authorized emails to their participant record or a default one
      const processedParticipants = authorizedEmails.map((email: string) => {
        const p = (participants || []).find((record: any) => record.email.toLowerCase() === email);
        
        if (p) {
          const lastActiveDate = p.last_active ? new Date(p.last_active) : null;
          const nowMs = now.getTime();
          const lastActiveMs = lastActiveDate ? lastActiveDate.getTime() : 0;
          const diffSeconds = Math.round(Math.abs(nowMs - lastActiveMs) / 1000);
          
          // Use a much wider 2-minute threshold for server/DB clock drift
          const isActive = diffSeconds < 120; 

          console.log(`  - ${email}: diff=${diffSeconds}s, lastActive=${lastActiveDate?.toISOString()}, now=${now.toISOString()}, active=${isActive}`);

          return {
            email: p.email,
            is_verified: p.is_verified,
            is_active: isActive
          };
        } else {
          return {
            email: email,
            is_verified: false,
            is_active: false
          };
        }
      });

      console.log(`--- PARTICIPANTS FOR ${id} ---`);
      processedParticipants.forEach((p: { email: string; is_verified: boolean; is_active: boolean }) => console.log(`  - ${p.email}: verified=${p.is_verified}, active=${p.is_active}`));

      return NextResponse.json({ ...post, participants: processedParticipants });
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error(`API Error in GET /api/posts/${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
