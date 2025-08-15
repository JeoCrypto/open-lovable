import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { file, content } = await request.json();
    
    if (!file || content === undefined) {
      return NextResponse.json({ error: 'File and content required' }, { status: 400 });
    }
    
    const filePath = path.join(process.cwd(), file);
    
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    return NextResponse.json({ success: true, message: 'File saved successfully' });
  } catch (error) {
    console.error('File save error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}