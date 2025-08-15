import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sandboxId = searchParams.get('sandboxId');
    
    if (!sandboxId) {
      return NextResponse.json({ error: 'Sandbox ID required' }, { status: 400 });
    }
    
    // Mock file structure - in production, this would fetch from the actual sandbox
    const files = [
      {
        name: 'src',
        type: 'folder',
        path: '/src',
        children: [
          {
            name: 'App.jsx',
            type: 'file',
            path: '/src/App.jsx',
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>Hello World</h1>
    </div>
  );
}

export default App;`
          },
          {
            name: 'index.css',
            type: 'file',
            path: '/src/index.css',
            content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`
          },
          {
            name: 'main.jsx',
            type: 'file',
            path: '/src/main.jsx',
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
          },
          {
            name: 'components',
            type: 'folder',
            path: '/src/components',
            children: []
          }
        ]
      },
      {
        name: 'index.html',
        type: 'file',
        path: '/index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PLC Karting</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
      }
    ];
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Failed to fetch sandbox files:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sandboxId, path, content } = await request.json();
    
    if (!sandboxId || !path || content === undefined) {
      return NextResponse.json({ 
        error: 'Sandbox ID, path, and content required' 
      }, { status: 400 });
    }
    
    // In production, this would save to the actual sandbox
    // For now, we'll simulate success
    console.log(`Saving file ${path} in sandbox ${sandboxId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'File saved successfully' 
    });
  } catch (error) {
    console.error('Failed to save sandbox file:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}