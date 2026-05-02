import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'posts.json');

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    const posts = JSON.parse(data);
    const post = posts.find((p: any) => p.id === params.id);
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    return NextResponse.json(post);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}
