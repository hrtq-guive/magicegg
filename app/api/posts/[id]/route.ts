import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Egg not found' }, { status: 404 });
    }

    if (post.unlock_type === 'simultaneous') {
      const { data: participants } = await supabase
        .from('egg_participants')
        .select('email, is_verified, last_active')
        .eq('post_id', id);

      const now = new Date();
      const processedParticipants = (participants || []).map(p => ({
        email: p.email,
        is_verified: p.is_verified,
        is_active: p.last_active ? (now.getTime() - new Date(p.last_active).getTime() < 20000) : false
      }));

      return NextResponse.json({ ...post, participants: processedParticipants });
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error(`API Error in GET /api/posts/${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
