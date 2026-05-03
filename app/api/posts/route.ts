import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { content, unlockType, unlockValue, unlockHint, customId, files } = await request.json();
    
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
    }

    let finalId = customId ? customId.trim() : '';
    
    // Check for uniqueness if customId is provided
    if (finalId) {
      const { data: existing } = await supabaseAdmin
        .from('posts')
        .select('id')
        .eq('id', finalId)
        .single();
      
      if (existing) {
        return NextResponse.json({ error: 'ID already exists' }, { status: 409 });
      }
    } else {
      // Generate a 6-character random alphanumeric ID
      let isUnique = false;
      while (!isUnique) {
        finalId = Math.random().toString(36).substring(2, 8);
        const { data: existing } = await supabaseAdmin
          .from('posts')
          .select('id')
          .eq('id', finalId)
          .single();
        if (!existing) isUnique = true;
      }
    }
    
    const newPost = {
      id: finalId,
      content,
      unlock_type: unlockType || '',
      unlock_value: unlockValue || '',
      unlock_hint: unlockHint || '',
      files: files || [],
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabaseAdmin
      .from('posts')
      .insert([newPost]);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(newPost, { status: 201 });
  } catch (error: any) {
    console.error('API Error in /api/posts:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error in GET /api/posts:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
