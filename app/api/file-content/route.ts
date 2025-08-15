import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'File parameter required' }, { status: 400 });
    }
    
    const filePath = path.join(process.cwd(), file);
    
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('File read error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}