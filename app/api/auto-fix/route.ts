import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { file, fix, explanation } = await request.json();
    
    if (file === 'app/layout.tsx' && fix.includes('suppressHydrationWarning')) {
      const filePath = path.join(process.cwd(), file);
      let content = await fs.readFile(filePath, 'utf-8');
      
      if (!content.includes('suppressHydrationWarning')) {
        content = content.replace(
          /<body className={inter.className}>/,
          '<body className={inter.className} suppressHydrationWarning>'
        );
        await fs.writeFile(filePath, content);
      }
      
      return NextResponse.json({ success: true, message: 'Hydration warning suppressed' });
    }
    
    if (file.endsWith('.css') && fix.includes('Remove markdown')) {
      const filePath = path.join(process.cwd(), file);
      let content = await fs.readFile(filePath, 'utf-8');
      
      content = content.replace(/^```css\n/, '').replace(/\n```$/, '');
      
      await fs.writeFile(filePath, content);
      return NextResponse.json({ success: true, message: 'CSS markdown syntax removed' });
    }
    
    if (file.includes('generate-ai-code-stream') && fix.includes('stream state checks')) {
      const filePath = path.join(process.cwd(), file);
      let content = await fs.readFile(filePath, 'utf-8');
      
      if (!content.includes('!stream.locked')) {
        content = content.replace(
          /await writer\.close\(\);/g,
          `try {
          if (writer && !stream.locked) {
            await writer.close();
          }
        } catch (closeError) {
          console.warn('Writer already closed or stream locked:', closeError);
        }`
        );
        await fs.writeFile(filePath, content);
      }
      
      return NextResponse.json({ success: true, message: 'Stream error handling added' });
    }
    
    if (file.includes('scrape-url-enhanced') && fix.includes('Validate and format URL')) {
      const filePath = path.join(process.cwd(), file);
      let content = await fs.readFile(filePath, 'utf-8');
      
      if (!content.includes('validateUrl')) {
        const urlValidation = `
function validateUrl(url: string): string {
  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const validUrl = new URL(url);
    return validUrl.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}
`;
        content = urlValidation + '\n' + content;
        content = content.replace(
          /const targetUrl = url;/g,
          'const targetUrl = validateUrl(url);'
        );
        await fs.writeFile(filePath, content);
      }
      
      return NextResponse.json({ success: true, message: 'URL validation added' });
    }
    
    return NextResponse.json({ success: false, message: 'No auto-fix available' });
  } catch (error) {
    console.error('Auto-fix error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}