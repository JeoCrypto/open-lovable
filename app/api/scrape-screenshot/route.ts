import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Extract URL from potential user prompt
    let extractedUrl = url;
    
    // Check if the input contains a URL within a larger text
    // Improved regex to handle domains with extensions like .pt, .com, etc.
    const urlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;
    const matches = url.match(urlPattern);
    
    if (matches && matches.length > 0) {
      // Take the first valid URL found
      extractedUrl = matches[0];
      // Clean up any trailing punctuation that's not part of the URL
      extractedUrl = extractedUrl.replace(/[,;!?\s]+$/, '');
      console.log('[scrape-screenshot] Extracted URL from prompt:', extractedUrl);
    } else {
      // If no full URL found, check if it's just a domain without protocol
      const domainPattern = /(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/g;
      const domainMatches = url.match(domainPattern);
      if (domainMatches && domainMatches.length > 0) {
        extractedUrl = domainMatches[0];
        console.log('[scrape-screenshot] Extracted domain from prompt:', extractedUrl);
      }
    }
    
    // Validate and format URL
    let validatedUrl = extractedUrl;
    try {
      if (!extractedUrl.startsWith('http://') && !extractedUrl.startsWith('https://')) {
        validatedUrl = 'https://' + extractedUrl;
      }
      const urlObj = new URL(validatedUrl);
      validatedUrl = urlObj.toString();
    } catch (error) {
      console.error('[scrape-screenshot] URL validation failed for:', extractedUrl);
      throw new Error(`Invalid URL format. Please provide a valid URL like "https://example.com"`);
    }

    // Use Firecrawl API to capture screenshot
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: validatedUrl,
        formats: ['screenshot'], // Regular viewport screenshot, not full page
        waitFor: 3000, // Wait for page to fully load
        timeout: 30000,
        blockAds: true,
        actions: [
          {
            type: 'wait',
            milliseconds: 2000 // Additional wait for dynamic content
          }
        ]
      })
    });

    if (!firecrawlResponse.ok) {
      const error = await firecrawlResponse.text();
      throw new Error(`Firecrawl API error: ${error}`);
    }

    const data = await firecrawlResponse.json();
    
    if (!data.success || !data.data?.screenshot) {
      throw new Error('Failed to capture screenshot');
    }

    return NextResponse.json({
      success: true,
      screenshot: data.data.screenshot,
      metadata: data.data.metadata
    });

  } catch (error: any) {
    console.error('Screenshot capture error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to capture screenshot' 
    }, { status: 500 });
  }
}