import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'posts.json');

// Ensure the data directory and file exist
async function ensureDataFile() {
  try {
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    try {
      await fs.access(dataFilePath);
    } catch {
      await fs.writeFile(dataFilePath, '[]');
    }
  } catch (error) {
    console.error('Error ensuring data file:', error);
  }
}

export async function GET() {
  await ensureDataFile();
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await ensureDataFile();
  try {
    const { content, unlockType, unlockValue, unlockHint, customId } = await request.json();
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const fileData = await fs.readFile(dataFilePath, 'utf8');
    const posts = JSON.parse(fileData);
    
    let finalId = customId ? customId.trim() : '';
    
    // Check for uniqueness if customId is provided
    if (finalId) {
      const exists = posts.some((p: any) => p.id === finalId);
      if (exists) {
        return NextResponse.json({ error: 'ID already exists' }, { status: 409 });
      }
    } else {
      // Generate a 6-character random alphanumeric ID
      finalId = Math.random().toString(36).substring(2, 8);
      // Ensure it doesn't collide (very unlikely but good practice)
      while (posts.some((p: any) => p.id === finalId)) {
        finalId = Math.random().toString(36).substring(2, 8);
      }
    }
    
    const newPost = {
      id: finalId,
      content,
      unlockType: unlockType || '',
      unlockValue: unlockValue || '',
      unlockHint: unlockHint || '',
      createdAt: new Date().toISOString()
    };
    
    posts.push(newPost);
    await fs.writeFile(dataFilePath, JSON.stringify(posts, null, 2));
    
    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
