'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
  content?: string; // For text extraction from PDFs, docs
  isProcessing?: boolean;
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  uploadedFiles: UploadedFile[];
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/*',
  'application/pdf',
  '.txt', '.md', '.json', '.csv',
  '.doc', '.docx',
  '.zip', '.rar',
  'audio/*',
  'video/*'
];

const MAX_FILE_SIZE_MB = 10;

export function FileUpload({
  onFilesUploaded,
  onFileRemove,
  uploadedFiles,
  maxFiles = 10,
  maxFileSize = MAX_FILE_SIZE_MB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = async (files: File[]) => {
    // Validate file count
    if (uploadedFiles.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file sizes and types
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is ${maxFileSize}MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newFiles: UploadedFile[] = [];

    for (const file of validFiles) {
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Create form data for upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileId', fileId);

        // Upload file
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: {
            // Let browser set content-type with boundary for FormData
          }
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Upload failed with status: ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        
        const uploadedFile: UploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: uploadResult.url,
          preview: uploadResult.preview,
          content: uploadResult.content,
          isProcessing: uploadResult.isProcessing
        };

        newFiles.push(uploadedFile);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload "${file.name}"`);
      }
    }

    if (newFiles.length > 0) {
      onFilesUploaded(newFiles);
    }

    // Clear progress after a delay
    setTimeout(() => {
      setUploadProgress(prev => {
        const updated = { ...prev };
        newFiles.forEach(file => delete updated[file.id]);
        return updated;
      });
    }, 2000);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return '🖼️';
    } else if (type === 'application/pdf') {
      return '📄';
    } else if (type.includes('document') || type.includes('word')) {
      return '📝';
    } else if (type.includes('spreadsheet') || type.includes('excel')) {
      return '📊';
    } else if (type.startsWith('audio/')) {
      return '🎵';
    } else if (type.startsWith('video/')) {
      return '🎬';
    } else if (type.includes('zip') || type.includes('rar')) {
      return '🗜️';
    } else {
      return '📎';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-container">
      {/* Upload Area */}
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        
        <div className="upload-content">
          <div className="upload-icon">📎</div>
          <p className="upload-text">
            {isDragging ? 'Drop files here' : 'Click to upload or drag & drop'}
          </p>
          <p className="upload-hint">
            Images, PDFs, documents, audio, video • Max {maxFileSize}MB each
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="uploaded-files"
          >
            <h4 className="files-title">Uploaded Files ({uploadedFiles.length})</h4>
            <div className="files-list">
              {uploadedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="file-item"
                >
                  <div className="file-info">
                    <span className="file-icon">{getFileIcon(file.type)}</span>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      {file.isProcessing && (
                        <span className="processing-status">Processing...</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Image Preview */}
                  {file.preview && (
                    <div className="file-preview">
                      <img src={file.preview} alt={file.name} />
                    </div>
                  )}
                  
                  {/* Upload Progress */}
                  {uploadProgress[file.id] !== undefined && uploadProgress[file.id] < 100 && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress[file.id]}%` }}
                      />
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemove(file.id);
                    }}
                    className="remove-button"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .file-upload-container {
          width: 100%;
        }

        .upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #f9fafb;
        }

        .upload-area:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .upload-area.dragging {
          border-color: #10b981;
          background: #ecfdf5;
          transform: scale(1.02);
        }

        .upload-content {
          pointer-events: none;
        }

        .upload-icon {
          font-size: 2rem;
          margin-bottom: 8px;
        }

        .upload-text {
          font-size: 16px;
          font-weight: 500;
          color: #374151;
          margin: 0 0 4px 0;
        }

        .upload-hint {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .uploaded-files {
          margin-top: 16px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .files-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
        }

        .files-list {
          space-y: 8px;
        }

        .file-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          margin-bottom: 8px;
          position: relative;
        }

        .file-info {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .file-icon {
          font-size: 1.5rem;
          margin-right: 12px;
        }

        .file-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-size {
          font-size: 12px;
          color: #6b7280;
        }

        .processing-status {
          font-size: 12px;
          color: #f59e0b;
          font-weight: 500;
        }

        .file-preview {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          overflow: hidden;
          margin-left: 12px;
        }

        .file-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #e5e7eb;
          border-radius: 0 0 6px 6px;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 0 0 6px 6px;
          transition: width 0.3s ease;
        }

        .remove-button {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          margin-left: 12px;
          transition: background 0.2s;
        }

        .remove-button:hover {
          background: #dc2626;
        }
      `}</style>
    </div>
  );
}