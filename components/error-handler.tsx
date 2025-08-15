'use client';

import { useEffect, useState } from 'react';
import { errorMonitor } from '@/lib/error-monitor';

interface ErrorFix {
  file: string;
  fix: string;
  explanation: string;
  manual?: boolean;
}

export function ErrorHandler() {
  const [errors, setErrors] = useState<Array<{ message: string; fix: ErrorFix | null }>>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  useEffect(() => {
    const handleError = async (event: ErrorEvent) => {
      const fix = await errorMonitor.autoFix(event.message);
      setErrors(prev => [...prev, { message: event.message, fix }]);
      
      if (fix && !fix.manual) {
        await applyAutoFix(fix);
      }
    };

    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      const message = event.reason?.toString() || 'Unknown error';
      const fix = await errorMonitor.autoFix(message);
      setErrors(prev => [...prev, { message, fix }]);
      
      if (fix && !fix.manual) {
        await applyAutoFix(fix);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    if (typeof window !== 'undefined' && window.console) {
      const originalError = console.error;
      console.error = function(...args) {
        const message = args.join(' ');
        errorMonitor.autoFix(message).then(fix => {
          if (fix) {
            setErrors(prev => [...prev, { message, fix }]);
            if (!fix.manual) {
              applyAutoFix(fix);
            }
          }
        });
        originalError.apply(console, args);
      };
    }

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const applyAutoFix = async (fix: ErrorFix) => {
    try {
      const response = await fetch('/api/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fix)
      });
      
      if (response.ok) {
        console.log(`Auto-fix applied for ${fix.file}: ${fix.explanation}`);
        setErrors(prev => prev.filter(e => e.fix?.file !== fix.file));
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to apply auto-fix:', error);
    }
  };

  const handleManualEdit = async (fix: ErrorFix) => {
    try {
      const response = await fetch(`/api/file-content?file=${encodeURIComponent(fix.file)}`);
      if (response.ok) {
        const content = await response.text();
        setFileContent(content);
        setEditingFile(fix.file);
        setShowEditor(true);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  const saveManualEdit = async () => {
    if (!editingFile) return;
    
    try {
      const response = await fetch('/api/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: editingFile, content: fileContent })
      });
      
      if (response.ok) {
        setShowEditor(false);
        setEditingFile(null);
        setErrors(prev => prev.filter(e => e.fix?.file !== editingFile));
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  if (errors.length === 0 && !showEditor) return null;

  return (
    <>
      {errors.length > 0 && (
        <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 z-50">
          <h3 className="text-red-800 font-semibold mb-2">Error Detected</h3>
          {errors.map((error, index) => (
            <div key={index} className="mb-3">
              <p className="text-red-600 text-sm mb-2">{error.message.slice(0, 150)}...</p>
              {error.fix && (
                <div className="bg-white p-2 rounded border border-red-100">
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>File:</strong> {error.fix.file}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">{error.fix.explanation}</p>
                  {error.fix.manual ? (
                    <button
                      onClick={() => handleManualEdit(error.fix!)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      Edit Manually
                    </button>
                  ) : (
                    <span className="text-green-600 text-sm">✓ Auto-fixing...</span>
                  )}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setErrors([])}
            className="text-red-500 text-sm underline"
          >
            Dismiss All
          </button>
        </div>
      )}

      {showEditor && editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-4/5 h-4/5 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Edit: {editingFile}</h2>
            </div>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="flex-1 p-4 font-mono text-sm"
              spellCheck={false}
            />
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveManualEdit}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}