import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: participants, error: pError } = await supabaseAdmin
      .from('egg_participants')
      .select('*')
      .limit(50);
    
    const { data: posts, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, unlock_type')
      .limit(10);

    return NextResponse.json({
      participants: participants || [],
      participants_error: pError,
      recent_posts: posts || [],
      posts_error: postError,
      env: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
