import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    console.log('[restore-project] Request data received:', JSON.stringify({
      hasFiles: requestData.files ? requestData.files.length : 0,
      hasPackages: requestData.packages ? requestData.packages.length : 0,
      sandboxId: requestData.sandboxId
    }));
    
    const { files, packages, sandboxId } = requestData;
    
    if (!files || !Array.isArray(files)) {
      console.error('[restore-project] Invalid files data:', typeof files);
      return NextResponse.json({ 
        error: 'Files array is required' 
      }, { status: 400 });
    }
    
    if (!sandboxId) {
      console.error('[restore-project] No sandboxId provided');
      return NextResponse.json({ 
        error: 'Sandbox ID is required' 
      }, { status: 400 });
    }
    
    console.log(`[restore-project] Restoring ${files.length} files to sandbox ${sandboxId}`);
    
    // Generate the response format expected by apply-ai-code-stream
    const fileContents = files.map(file => 
      `<file path="${file.path}">\n${file.content}\n</file>`
    ).join('\n');
    
    // Apply all files to the sandbox
    const applyResponse = await fetch(`${request.nextUrl.origin}/api/apply-ai-code-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: fileContents,
        isEdit: false,
        packages: packages || [],
        sandboxId
      })
    });
    
    if (!applyResponse.ok) {
      const error = await applyResponse.text();
      console.error('[restore-project] Failed to apply files:', error);
      return NextResponse.json({ 
        error: 'Failed to apply files to sandbox',
        details: error
      }, { status: 500 });
    }
    
    // Handle streaming response from apply-ai-code-stream
    const contentType = applyResponse.headers.get('Content-Type');
    console.log('[restore-project] Apply response content-type:', contentType);
    console.log('[restore-project] Response ok:', applyResponse.ok, 'Status:', applyResponse.status);
    
    if (contentType?.includes('text/event-stream')) {
      // It's a streaming response, we need to read it differently
      console.log('[restore-project] Handling streaming response from apply-ai-code-stream');
      
      // For restore project, we don't need to stream back to client
      // We'll just read through the stream to completion
      const reader = applyResponse.body?.getReader();
      const decoder = new TextDecoder();
      let completed = false;
      let lastResult: any = null;
      
      if (reader) {
        try {
          while (!completed) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('[restore-project] Stream reading completed, done=true');
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.trim().startsWith('data: ')) {
                try {
                  const jsonStr = line.substring(6);
                  console.log('[restore-project] Parsing JSON:', jsonStr.substring(0, 100) + '...');
                  const data = JSON.parse(jsonStr);
                  if (data.type === 'complete') {
                    completed = true;
                    lastResult = data;
                    console.log('[restore-project] Found complete event');
                  }
                } catch (parseError) {
                  console.log('[restore-project] Failed to parse line:', line.substring(0, 100));
                  // Skip invalid JSON lines
                }
              }
            }
          }
        } catch (streamError) {
          console.error('[restore-project] Error reading stream:', streamError);
          throw new Error(`Stream reading failed: ${streamError}`);
        } finally {
          reader.releaseLock();
        }
      }
      
      console.log('[restore-project] Stream completed, last result:', lastResult);
    } else {
      // Regular JSON response - this is where the original error is happening
      console.log('[restore-project] Attempting to parse as regular JSON');
      
      // Read the response text first, then try to parse it
      const responseText = await applyResponse.text();
      console.log('[restore-project] Raw response text:', responseText.substring(0, 500));
      
      try {
        const result = JSON.parse(responseText);
        console.log('[restore-project] Regular JSON response received:', result);
      } catch (jsonError) {
        console.error('[restore-project] Failed to parse JSON response:', jsonError);
        console.error('[restore-project] Response appears to be streaming format:', responseText.substring(0, 200));
        
        // It seems the response is actually streaming format, even though content-type suggests otherwise
        // Let's handle it as a streaming response manually
        console.log('[restore-project] Attempting to parse as streaming response manually');
        const lines = responseText.split('\n');
        let found = false;
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'complete') {
                console.log('[restore-project] Found complete event in manual parse');
                found = true;
                break;
              }
            } catch (e) {
              // Continue trying other lines
            }
          }
        }
        
        if (!found) {
          throw new Error(`Could not parse response as JSON or streaming format. Response: ${responseText.substring(0, 200)}`);
        }
      }
    }
    
    // Restart Vite to ensure changes are loaded
    const restartResponse = await fetch(`${request.nextUrl.origin}/api/restart-vite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId })
    });
    
    if (!restartResponse.ok) {
      console.warn('[restore-project] Failed to restart Vite, but files were restored');
    }
    
    return NextResponse.json({ 
      success: true,
      filesRestored: files.length,
      packagesRestored: packages?.length || 0,
      message: 'Project restored successfully'
    });
    
  } catch (error) {
    console.error('[restore-project] Error:', error);
    return NextResponse.json({ 
      error: String(error) 
    }, { status: 500 });
  }
}