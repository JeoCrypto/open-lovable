'use client';

import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeEditorProps {
  initialCode: string;
  language: string;
  fileName: string;
  onSave: (code: string) => Promise<void>;
  readOnly?: boolean;
}

export function CodeEditor({ 
  initialCode, 
  language, 
  fileName, 
  onSave,
  readOnly = false 
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setCode(initialCode);
    setHasChanges(false);
  }, [initialCode]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setHasChanges(newCode !== initialCode);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      await onSave(code);
      setHasChanges(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCode(initialCode);
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="code-editor-container">
      <div className="editor-header">
        <span className="file-name">{fileName}</span>
        <div className="editor-actions">
          {!readOnly && (
            <>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-button"
                  title="Edit code (E)"
                >
                  ✏️ Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="save-button"
                    disabled={!hasChanges || isSaving}
                    title="Save changes (Cmd/Ctrl + S)"
                  >
                    {isSaving ? '💾 Saving...' : '💾 Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="cancel-button"
                    title="Cancel changes (Esc)"
                  >
                    ❌ Cancel
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="editor-wrapper">
          <div className="line-numbers">
            {code.split('\n').map((_, index) => (
              <div key={index} className="line-number">
                {index + 1}
              </div>
            ))}
          </div>
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="code-textarea"
            spellCheck={false}
            autoFocus
            placeholder="Enter your code here..."
          />
        </div>
      ) : (
        <div className="syntax-highlighter-wrapper">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            showLineNumbers
            customStyle={{
              margin: 0,
              borderRadius: '0 0 8px 8px',
              fontSize: '14px',
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )}

      <style jsx>{`
        .code-editor-container {
          background: #1e1e1e;
          border-radius: 8px;
          overflow: hidden;
          margin: 10px 0;
        }

        .editor-header {
          background: #2d2d30;
          padding: 10px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #3e3e42;
        }

        .file-name {
          color: #cccccc;
          font-size: 14px;
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .editor-actions {
          display: flex;
          gap: 8px;
        }

        .edit-button, .save-button, .cancel-button {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .edit-button {
          background: #0e639c;
          color: white;
        }

        .edit-button:hover {
          background: #1177bb;
        }

        .save-button {
          background: #16825d;
          color: white;
        }

        .save-button:hover:not(:disabled) {
          background: #1e9e6f;
        }

        .save-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cancel-button {
          background: #a1260d;
          color: white;
        }

        .cancel-button:hover {
          background: #c53222;
        }

        .editor-wrapper {
          display: flex;
          position: relative;
          background: #1e1e1e;
          min-height: 300px;
        }

        .line-numbers {
          background: #1e1e1e;
          color: #858585;
          padding: 10px 5px;
          text-align: right;
          user-select: none;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          line-height: 21px;
          border-right: 1px solid #2d2d30;
          min-width: 40px;
        }

        .line-number {
          padding: 0 10px;
        }

        .code-textarea {
          flex: 1;
          background: #1e1e1e;
          color: #d4d4d4;
          border: none;
          outline: none;
          padding: 10px 15px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          line-height: 21px;
          resize: vertical;
          min-height: 300px;
          tab-size: 2;
        }

        .syntax-highlighter-wrapper {
          background: #1e1e1e;
        }
      `}</style>
    </div>
  );
}