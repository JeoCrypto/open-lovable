'use client';

import { useState, useEffect } from 'react';

interface SandboxWarningProps {
  sandboxId: string | null;
  onCreateNewSandbox: () => void;
}

export function SandboxWarning({ sandboxId, onCreateNewSandbox }: SandboxWarningProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);

  useEffect(() => {
    // Check if there's a backup available
    const backup = localStorage.getItem('lovable_project_state');
    setHasBackup(!!backup);
  }, []);

  useEffect(() => {
    if (!sandboxId) return;

    // E2B sandboxes typically last 15 minutes
    const SANDBOX_LIFETIME = 15 * 60 * 1000; // 15 minutes in ms
    const WARNING_THRESHOLD = 2 * 60 * 1000; // Show warning 2 minutes before expiry
    
    let startTime = Date.now();
    
    // Try to get start time from session storage
    const savedStartTime = sessionStorage.getItem(`sandbox_start_${sandboxId}`);
    if (savedStartTime) {
      startTime = parseInt(savedStartTime);
    } else {
      sessionStorage.setItem(`sandbox_start_${sandboxId}`, startTime.toString());
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = SANDBOX_LIFETIME - elapsed;
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        setShowWarning(true);
        clearInterval(interval);
      } else if (remaining <= WARNING_THRESHOLD) {
        setTimeRemaining(remaining);
        setShowWarning(true);
      } else {
        setTimeRemaining(remaining);
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sandboxId]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning || timeRemaining === null) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`p-4 rounded-lg shadow-lg border ${
        timeRemaining <= 0 
          ? 'bg-red-50 border-red-200 text-red-800' 
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {timeRemaining <= 0 ? (
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium">
              {timeRemaining <= 0 ? 'Sandbox Expired' : 'Sandbox Expiring Soon'}
            </h3>
            <div className="mt-1">
              <p className="text-sm">
                {timeRemaining <= 0 
                  ? 'Your sandbox has expired. Create a new one to continue working.'
                  : `Your sandbox will expire in ${formatTime(timeRemaining)}.`
                }
              </p>
              {hasBackup && (
                <p className="text-sm mt-1 font-medium">
                  ✅ Your project is automatically backed up and will be restored.
                </p>
              )}
            </div>
            <div className="mt-3">
              <button
                onClick={() => {
                  onCreateNewSandbox();
                  setShowWarning(false);
                }}
                className={`text-sm font-medium px-3 py-1 rounded ${
                  timeRemaining <= 0
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {timeRemaining <= 0 ? 'Create New Sandbox' : 'Extend Session'}
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="ml-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}