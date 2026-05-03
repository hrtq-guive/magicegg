"use client";

import { useState, useRef } from 'react';
import { Paperclip, X, ArrowLeft, Copy, Share2, Check } from 'lucide-react';
import LockIcon from '@/components/LockIcon';

type FilePreview = {
  file: File;
  type: 'image' | 'video' | 'audio';
  url: string;
};

type FlowState = 'content' | 'params' | 'locking' | 'revealed';

const UNLOCK_METHODS = [
  { value: '', label: 'None' },
  { value: 'password', label: 'Password' },
  { value: 'time', label: 'Time' },
  { value: 'location', label: 'Location' },
  { value: 'simultaneous', label: 'Simultaneous' },
  { value: 'link', label: 'Link' },
];

export default function NewLockPage() {
  const [flow, setFlow] = useState<FlowState>('content');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [unlockType, setUnlockType] = useState('');
  const [unlockValue, setUnlockValue] = useState('');
  const [unlockHint, setUnlockHint] = useState('');
  const [customId, setCustomId] = useState('');
  const [idError, setIdError] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [lockPhase, setLockPhase] = useState<'open' | 'locking' | 'idle'>('open');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasContent = content.trim().length > 0 || files.length > 0;

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
      if (type) newFiles.push({ file, type, url: URL.createObjectURL(file) });
    }
    setFiles(prev => [...prev, ...newFiles]);
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

  const handleLock = async () => {
    if (!hasContent || isSubmitting) return;
    setIdError('');
    setSubmitError('');
    setIsSubmitting(true);
    
    console.log('Starting lock creation...', { content, unlockType, unlockValue, customId });

    // Phase 1: Lock appears open in center
    setFlow('locking');
    setLockPhase('open');

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          unlockType,
          unlockValue: unlockValue.trim(),
          unlockHint: unlockHint.trim(),
          customId: customId.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        console.error('Lock creation failed:', res.status, errorData);

        if (res.status === 409) {
          setIdError('This link ID is already taken.');
          setFlow('params');
          setLockPhase('open');
          setIsSubmitting(false);
          return;
        }
        
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      console.log('Lock created successfully:', data);
      const id = data.id || customId.trim() || 'your-lock';
      setFinalUrl(`chaosbox.com/${id}`);

      // Phase 2: Wait briefly, then snap shut
      setTimeout(() => {
        setLockPhase('locking');
        
        // Phase 3: Wait for lock animation to settle, then reveal content
        setTimeout(() => {
          setFlow('revealed');
          setLockPhase('idle');
          setIsSubmitting(false);
        }, 1000);
      }, 500);

    } catch (err: any) {
      console.error('Catch block error:', err);
      setSubmitError(err.message || 'Failed to create lock. Please try again.');
      setFlow('params');
      setLockPhase('open');
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${finalUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReset = () => {
    setFlow('content');
    setContent('');
    setFiles([]);
    setUnlockType('');
    setUnlockValue('');
    setUnlockHint('');
    setCustomId('');
    setIdError('');
    setFinalUrl('');
    setCopied(false);
    setLockPhase('open');
  };

  const unlockMethodMeta = {
    password: { label: 'Password', placeholder: '•••••••', inputType: 'password' },
    time: { label: 'Unlock after', placeholder: '', inputType: 'datetime-local' },
    location: { label: 'Location', placeholder: '48.8566, 2.3522', inputType: 'text' },
    simultaneous: { label: 'People (emails)', placeholder: 'alice@mail.com, bob@mail.com', inputType: 'text' },
    link: { label: 'Link key', placeholder: 'secret-path', inputType: 'text' },
  } as Record<string, { label: string; placeholder: string; inputType: string }>;

  return (
    <div className="h-screen w-full flex flex-col bg-[#f0f0f4] text-[#111111] overflow-hidden relative font-elegant">

      {/* ── Back arrow ── */}
      <div className="absolute top-6 left-6 md:top-9 md:left-9 z-10">
        {flow === 'params' ? (
          <button onClick={() => setFlow('content')} className="text-black/25 hover:text-black/60 transition-colors">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
        ) : flow === 'content' ? (
          <a href="/" className="text-black/25 hover:text-black/60 transition-colors">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </a>
        ) : null}
      </div>

      {/* ── Step dots ── */}
      {(flow === 'content' || flow === 'params') && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          <div className={`rounded-full transition-all duration-300 ${flow === 'content' ? 'w-4 h-1.5 bg-black/50' : 'w-1.5 h-1.5 bg-black/20'}`} />
          <div className={`rounded-full transition-all duration-300 ${flow === 'params' ? 'w-4 h-1.5 bg-black/50' : 'w-1.5 h-1.5 bg-black/20'}`} />
        </div>
      )}

      {/* ════════════════════════════════════
          STEP 1 — CONTENT
      ════════════════════════════════════ */}
      {flow === 'content' && (
        <div className="flex-1 flex flex-col justify-center px-8 md:px-24 lg:px-32 animate-in slide-in-from-bottom-1 duration-150">
          <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">

            {/* File chips */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {files.map((f, i) => (
                  <div key={i} className="file-preview-chip">
                    {f.type === 'image' && <img src={f.url} alt="" className="file-preview-thumb" />}
                    {f.type === 'video' && <video src={f.url} className="file-preview-thumb" />}
                    {f.type === 'audio' && <div className="file-preview-audio">♪</div>}
                    <span className="file-preview-name">{f.file.name}</span>
                    <button onClick={() => removeFile(i)} className="file-preview-remove"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              autoFocus
              value={content}
              style={{ outline: 'none' }}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write something..."
              className="input-content-area"
              rows={1}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = t.scrollHeight + 'px';
              }}
            />

            {/* Attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="self-start text-black/20 hover:text-black/50 transition-colors"
              title="Attach file"
            >
              <Paperclip size={18} strokeWidth={1.5} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" multiple onChange={handleFileSelect} className="hidden" />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          STEP 2 — PARAMETERS
      ════════════════════════════════════ */}
      {flow === 'params' && (
        <div className="flex-1 flex flex-col justify-center px-8 md:px-24 lg:px-32 animate-in slide-in-from-bottom-1 duration-150">
          <div className="w-full max-w-xl mx-auto flex flex-col gap-12">

            {/* Unlock method chips */}
            <div className="flex flex-col gap-5">
              <span className="params-label">Unlock method</span>
              <div className="flex flex-wrap gap-2.5">
                {UNLOCK_METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => {
                      setUnlockType(m.value);
                      setUnlockValue('');
                      setUnlockHint('');
                    }}
                    className={`method-chip ${unlockType === m.value ? 'method-chip--active' : ''}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra fields — always rendered, CSS transition controls visibility */}
            <div className={`method-fields-expand ${unlockType !== '' ? 'method-fields-expand--open' : ''}`}>
              <div className="flex flex-col gap-4">
                <span className="params-label">{unlockMethodMeta[unlockType]?.label ?? ''}</span>
                <input
                  key={unlockType}
                  type={unlockMethodMeta[unlockType]?.inputType ?? 'text'}
                  value={unlockValue}
                  onChange={(e) => setUnlockValue(e.target.value)}
                  placeholder={unlockMethodMeta[unlockType]?.placeholder ?? ''}
                  className="params-input"
                  style={{ outline: 'none' }}
                />
              </div>
              <div className="flex flex-col gap-4">
                <span className="params-label">Hint <span className="opacity-40 normal-case tracking-normal font-normal text-sm">— optional</span></span>
                <input
                  type="text"
                  value={unlockHint}
                  onChange={(e) => setUnlockHint(e.target.value)}
                  placeholder="Help them know how to unlock…"
                  className="params-input"
                  style={{ outline: 'none' }}
                />
              </div>
            </div>

            {/* Custom URL */}
            <div className="flex flex-col gap-4">
              <span className="params-label">Custom URL <span className="opacity-40 normal-case tracking-normal font-normal text-sm">— optional</span></span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-black/25 text-2xl leading-none select-none">chaosbox.com/</span>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => { setCustomId(e.target.value.replace(/[^a-zA-Z0-9-]/g, '')); setIdError(''); }}
                  placeholder="your-slug"
                  className="params-input flex-1"
                />
              </div>
              {idError && <span className="text-red-400 text-sm">{idError}</span>}
              {submitError && <span className="text-red-400 text-sm text-center mt-2">{submitError}</span>}
            </div>

            {/* Centered Lock Button */}
            <div className="flex justify-center mt-4">
              <button onClick={handleLock} disabled={!hasContent} className="transition-transform duration-300 hover:scale-105">
                <LockIcon phase={lockPhase} onClick={() => {}} size={0.35} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          LOCKING & REVEALED — Shared Center State
      ════════════════════════════════════ */}
      {(flow === 'locking' || flow === 'revealed') && (
        <div className="flex-1 flex flex-col items-center pt-[25vh] md:pt-[30vh] px-6 md:px-24 animate-in duration-150">
          
          {/* Steady Lock */}
          <div className="animate-in zoom-in-95 duration-200 mb-20">
            <LockIcon phase={lockPhase} onClick={() => {}} size={1.4} />
          </div>

          {/* Message (only in revealed) */}
          {flow === 'revealed' && (
            <div className="flex flex-col items-center gap-10 animate-in fade-in slide-in-from-top-2 duration-700 delay-200">
              <div className="text-center">
                <span className="text-3xl md:text-5xl font-elegant text-black/80 tracking-tight select-all cursor-text">
                  {finalUrl}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button 
                  onClick={handleCopy} 
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-black text-[#f0f0f4] hover:bg-black/80 transition-all duration-300 text-sm tracking-widest uppercase flex items-center justify-center gap-2.5"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} strokeWidth={1.5} />}
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
                
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={() => (navigator as Navigator & { share: (data: object) => void }).share({ url: `https://${finalUrl}`, title: 'Chaosbox' })}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-black/15 text-black/55 hover:border-black/30 hover:text-black/80 transition-all duration-300 text-sm tracking-widest uppercase flex items-center justify-center gap-2.5"
                  >
                    <Share2 size={14} strokeWidth={1.5} />
                    Share
                  </button>
                )}
              </div>

              <button onClick={handleReset} className="text-black/20 hover:text-black/50 transition-colors text-xs tracking-[0.2em] uppercase">
                Create Another
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom nav ── */}
      {flow === 'content' && (
        <div className="absolute bottom-6 right-6 md:bottom-9 md:right-10 z-10 flex items-center gap-6">
          <button
            onClick={() => { if (hasContent) setFlow('params'); }}
            disabled={!hasContent}
            className={`text-sm tracking-widest uppercase transition-all duration-300 ${hasContent ? 'text-black/45 hover:text-black/80' : 'text-black/15 cursor-default'}`}
          >
            Next →
          </button>
        </div>
      )}

    </div>
  );
}
