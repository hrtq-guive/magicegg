"use client";

import { useState, useRef } from 'react';
import { Paperclip, X, ArrowLeft, LockOpen } from 'lucide-react';

type FilePreview = {
  file: File;
  type: 'image' | 'video' | 'audio';
  url: string;
};

export default function InputPage() {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getFileType = (file: File): 'image' | 'video' | 'audio' | null => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: FilePreview[] = [];
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const type = getFileType(file);
      if (type) {
        newFiles.push({
          file,
          type,
          url: URL.createObjectURL(file),
        });
      }
    }
    setFiles(prev => [...prev, ...newFiles]);
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    setStatus('loading');
    try {
      // For now, submit text/URL content to the existing API
      if (content.trim()) {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() })
        });
        if (!res.ok) throw new Error('Failed');
      }

      // TODO: file upload API for media
      
      setStatus('success');
      setContent('');
      setFiles([]);

      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasContent = content.trim().length > 0 || files.length > 0;

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f0f0f4] text-[#111111]">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-8">
        <a href="/" className="text-black/20 hover:text-black/50 transition-colors">
          <ArrowLeft size={20} />
        </a>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-8 pb-8">
        <div className="w-full max-w-2xl">

          {/* Text area */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write something, paste a URL..."
            className="input-textarea"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />

          {/* File previews */}
          {files.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {files.map((f, i) => (
                <div key={i} className="file-preview-chip">
                  {f.type === 'image' && (
                    <img src={f.url} alt="" className="file-preview-thumb" />
                  )}
                  {f.type === 'video' && (
                    <video src={f.url} className="file-preview-thumb" />
                  )}
                  {f.type === 'audio' && (
                    <div className="file-preview-audio">♪</div>
                  )}
                  <span className="file-preview-name">{f.file.name}</span>
                  <button onClick={() => removeFile(i)} className="file-preview-remove">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom actions */}
          <div className="mt-8 flex items-center justify-between">
            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="input-icon-btn"
              title="Attach image, video, or audio"
            >
              <Paperclip size={18} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!hasContent || status === 'loading'}
              className="input-submit-btn"
            >
              {status === 'loading' ? '...' : status === 'success' ? '✓' : <LockOpen size={18} />}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
