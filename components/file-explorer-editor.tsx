'use client';

import { useState, useEffect } from 'react';
import { CodeEditor } from './code-editor';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
  language?: string;
}

interface FileExplorerEditorProps {
  files: FileNode[];
  onFileSave?: (path: string, content: string) => Promise<void>;
}

export function FileExplorerEditor({ files, onFileSave }: FileExplorerEditorProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    // Load initial file contents
    const loadFileContents = async () => {
      const contents = new Map<string, string>();
      
      const loadFiles = async (nodes: FileNode[]) => {
        for (const node of nodes) {
          if (node.type === 'file' && node.content) {
            contents.set(node.path, node.content);
          }
          if (node.children) {
            await loadFiles(node.children);
          }
        }
      };
      
      await loadFiles(files);
      setFileContents(contents);
    };
    
    loadFileContents();
  }, [files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectFile = async (file: FileNode) => {
    if (file.type === 'file') {
      // Try to load file content if not already loaded
      if (!fileContents.has(file.path)) {
        try {
          const response = await fetch(`/api/file-content?file=${encodeURIComponent(file.path)}`);
          if (response.ok) {
            const content = await response.text();
            setFileContents((prev) => new Map(prev).set(file.path, content));
          }
        } catch (error) {
          console.error('Failed to load file:', error);
        }
      }
      setSelectedFile(file);
    }
  };

  const getFileLanguage = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const handleFileSave = async (content: string) => {
    if (!selectedFile) return;
    
    // Update local state
    setFileContents((prev) => new Map(prev).set(selectedFile.path, content));
    
    // Call the save handler if provided
    if (onFileSave) {
      await onFileSave(selectedFile.path, content);
    } else {
      // Default save to API
      const response = await fetch('/api/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: selectedFile.path, content })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save file');
      }
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} className="tree-node">
        <div
          className={`tree-item ${selectedFile?.path === node.path ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 20 + 10}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else {
              selectFile(node);
            }
          }}
        >
          <span className="tree-icon">
            {node.type === 'folder' ? (
              expandedFolders.has(node.path) ? '📂' : '📁'
            ) : (
              '📄'
            )}
          </span>
          <span className="tree-name">{node.name}</span>
        </div>
        {node.type === 'folder' && node.children && expandedFolders.has(node.path) && (
          <div className="tree-children">
            {renderFileTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="file-explorer-editor">
      <div className="editor-toolbar">
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`mode-toggle ${isEditMode ? 'active' : ''}`}
        >
          {isEditMode ? '👁️ View Mode' : '✏️ Edit Mode'}
        </button>
        {selectedFile && (
          <span className="current-file">
            Current: {selectedFile.name}
          </span>
        )}
      </div>

      <div className="editor-container">
        <div className="file-tree">
          <div className="tree-header">Files</div>
          <div className="tree-content">
            {renderFileTree(files)}
          </div>
        </div>

        <div className="code-panel">
          {selectedFile && fileContents.has(selectedFile.path) ? (
            <CodeEditor
              key={selectedFile.path}
              initialCode={fileContents.get(selectedFile.path) || ''}
              language={getFileLanguage(selectedFile.name)}
              fileName={selectedFile.name}
              onSave={handleFileSave}
              readOnly={!isEditMode}
            />
          ) : (
            <div className="no-file-selected">
              <p>Select a file to view or edit</p>
              <p className="hint">Click on any file in the explorer to open it</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .file-explorer-editor {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #252526;
        }

        .editor-toolbar {
          background: #2d2d30;
          padding: 10px 15px;
          display: flex;
          align-items: center;
          gap: 20px;
          border-bottom: 1px solid #3e3e42;
        }

        .mode-toggle {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: #0e639c;
          color: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .mode-toggle:hover {
          background: #1177bb;
        }

        .mode-toggle.active {
          background: #16825d;
        }

        .current-file {
          color: #cccccc;
          font-size: 14px;
        }

        .editor-container {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .file-tree {
          width: 250px;
          background: #252526;
          border-right: 1px solid #3e3e42;
          overflow-y: auto;
        }

        .tree-header {
          padding: 10px 15px;
          font-size: 12px;
          text-transform: uppercase;
          color: #cccccc;
          background: #2d2d30;
          border-bottom: 1px solid #3e3e42;
        }

        .tree-content {
          padding: 5px 0;
        }

        .tree-item {
          display: flex;
          align-items: center;
          padding: 5px 10px;
          cursor: pointer;
          color: #cccccc;
          font-size: 14px;
          user-select: none;
          transition: background 0.1s;
        }

        .tree-item:hover {
          background: #2a2d2e;
        }

        .tree-item.selected {
          background: #094771;
        }

        .tree-icon {
          margin-right: 5px;
        }

        .tree-name {
          flex: 1;
        }

        .code-panel {
          flex: 1;
          overflow: auto;
          background: #1e1e1e;
          padding: 20px;
        }

        .no-file-selected {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #858585;
        }

        .no-file-selected p {
          margin: 10px 0;
        }

        .hint {
          font-size: 12px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}