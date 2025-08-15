import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Extract text from PDF using pdf-parse (dynamic import)
async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    const pdf = await import('pdf-parse');
    const data = await pdf.default(buffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error);
    return 'Failed to extract PDF text';
  }
}

// Process image and create preview
async function processImage(buffer: Buffer, filename: string): Promise<{
  url: string;
  preview: string;
}> {
  await ensureUploadDir();
  
  const timestamp = Date.now();
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);
  const safeFilename = `${nameWithoutExt}-${timestamp}${ext}`;
  const previewFilename = `${nameWithoutExt}-${timestamp}-preview.webp`;
  
  // Save original image
  const originalPath = path.join(UPLOAD_DIR, safeFilename);
  await writeFile(originalPath, buffer);
  
  // Create preview thumbnail
  const previewPath = path.join(UPLOAD_DIR, previewFilename);
  await sharp(buffer)
    .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(previewPath);
  
  return {
    url: `/uploads/${safeFilename}`,
    preview: `/uploads/${previewFilename}`
  };
}

// Process document and extract text
async function processDocument(buffer: Buffer, filename: string, mimeType: string): Promise<{
  url: string;
  content?: string;
}> {
  await ensureUploadDir();
  
  const timestamp = Date.now();
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);
  const safeFilename = `${nameWithoutExt}-${timestamp}${ext}`;
  
  // Save file
  const filePath = path.join(UPLOAD_DIR, safeFilename);
  await writeFile(filePath, buffer);
  
  let content = '';
  
  // Extract text based on file type
  if (mimeType === 'application/pdf') {
    content = await extractPDFText(buffer);
  } else if (mimeType === 'text/plain' || filename.endsWith('.txt')) {
    content = buffer.toString('utf-8');
  } else if (filename.endsWith('.md')) {
    content = buffer.toString('utf-8');
  } else if (filename.endsWith('.json')) {
    try {
      const jsonData = JSON.parse(buffer.toString('utf-8'));
      content = JSON.stringify(jsonData, null, 2);
    } catch {
      content = buffer.toString('utf-8');
    }
  } else if (filename.endsWith('.csv')) {
    content = buffer.toString('utf-8');
  }
  
  return {
    url: `/uploads/${safeFilename}`,
    content: content || undefined
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = formData.get('fileId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const filename = file.name;
    
    let result: {
      url: string;
      preview?: string;
      content?: string;
      isProcessing?: boolean;
    };
    
    if (mimeType.startsWith('image/')) {
      // Process image
      const imageResult = await processImage(buffer, filename);
      result = imageResult;
    } else if (
      mimeType === 'application/pdf' ||
      mimeType === 'text/plain' ||
      filename.endsWith('.txt') ||
      filename.endsWith('.md') ||
      filename.endsWith('.json') ||
      filename.endsWith('.csv')
    ) {
      // Process document
      const docResult = await processDocument(buffer, filename, mimeType);
      result = docResult;
    } else {
      // For other file types, just save them
      await ensureUploadDir();
      const timestamp = Date.now();
      const ext = path.extname(filename);
      const nameWithoutExt = path.basename(filename, ext);
      const safeFilename = `${nameWithoutExt}-${timestamp}${ext}`;
      const filePath = path.join(UPLOAD_DIR, safeFilename);
      await writeFile(filePath, buffer);
      
      result = {
        url: `/uploads/${safeFilename}`
      };
    }
    
    return NextResponse.json({
      success: true,
      fileId,
      ...result
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({ status: 'Upload service is running' });
}