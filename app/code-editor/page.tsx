'use client';

import { useState, useEffect } from 'react';
import { FileExplorerEditor } from '@/components/file-explorer-editor';

export default function CodeEditorPage() {
  const [files, setFiles] = useState([]);
  const [sandboxId, setSandboxId] = useState<string | null>(null);

  useEffect(() => {
    // Get sandbox ID from URL params
    const params = new URLSearchParams(window.location.search);
    const id = params.get('sandbox');
    setSandboxId(id);
    
    if (id) {
      loadSandboxFiles(id);
    }
  }, []);

  const loadSandboxFiles = async (id: string) => {
    try {
      const response = await fetch(`/api/sandbox-files?sandboxId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load sandbox files:', error);
    }
  };

  const handleFileSave = async (path: string, content: string) => {
    if (!sandboxId) {
      throw new Error('No sandbox ID');
    }
    
    const response = await fetch('/api/sandbox-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId, path, content })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save file');
    }
    
    // Optionally reload the sandbox to see changes
    const reloadResponse = await fetch('/api/restart-vite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId })
    });
    
    if (reloadResponse.ok) {
      console.log('Sandbox reloaded with changes');
    }
  };

  return (
    <div className="code-editor-page">
      <div className="page-header">
        <h1>Code Editor</h1>
        {sandboxId && (
          <span className="sandbox-info">Sandbox: {sandboxId}</span>
        )}
      </div>
      
      <div className="editor-wrapper">
        <FileExplorerEditor 
          files={files} 
          onFileSave={handleFileSave}
        />
      </div>

      <style jsx>{`
        .code-editor-page {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #1e1e1e;
          color: #cccccc;
        }

        .page-header {
          background: #007acc;
          color: white;
          padding: 15px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .page-header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
        }

        .sandbox-info {
          font-size: 14px;
          opacity: 0.9;
        }

        .editor-wrapper {
          flex: 1;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}