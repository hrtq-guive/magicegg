import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const decodedId = decodeURIComponent(params.id).trim();

  // Re-initialize locally to avoid any shared client/cache issues
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const localAdmin = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`--- POLLING ATTEMPT: ${decodedId} (URL: ${supabaseUrl.substring(0, 20)}...) ---`);

  try {
    // 1. Fetch post
    const { data: post, error: postError } = await localAdmin
      .from('posts')
      .select('*')
      .ilike('id', decodedId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }

    // 2. Simultaneous logic
    if (post.unlock_type === 'simultaneous') {
      // DEBUG: Fetch ALL participants to see what the client sees
      const { data: allRows } = await localAdmin.from('egg_participants').select('id, post_id, email, is_verified');
      console.log(`--- TABLE SCAN: ${allRows?.length || 0} rows found in egg_participants ---`);
      
      if (allRows && allRows.length > 0) {
        const sample = allRows[0];
        console.log(`--- SAMPLE ROW: post_id="${sample.post_id}", type=${typeof sample.post_id} ---`);
      }

      // Perform the actual filter
      const { data: participants, error: pError } = await localAdmin
        .from('egg_participants')
        .select('email, is_verified')
        .ilike('post_id', decodedId);

      const dbParticipants = participants || [];
      console.log(`--- FILTERED RESULT: Found ${dbParticipants.length} for ${decodedId} ---`);

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
    console.error(`--- CRITICAL POLLING ERROR:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
