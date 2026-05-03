import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = `${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload using Admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('egg-contents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Admin upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the path (not the public URL, as the bucket is private)
    return NextResponse.json({ path: data.path });
  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
