"use client";

import { useState, useRef } from 'react';
import { Paperclip, X, ArrowLeft, Copy, Share2, Check, ArrowRight } from 'lucide-react';
import WhiteEgg from '@/components/WhiteEgg';
import { supabase } from '@/lib/supabase';

type FilePreview = {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  url: string;
};

type FlowState = 'content' | 'params' | 'locking' | 'revealed';

const UNLOCK_METHODS = [
  { value: '', label: 'None' },
  { value: 'password', label: 'Password' },
  { value: 'time', label: 'Time' },
  { value: 'location', label: 'Location' },
  { value: 'simultaneous', label: 'Simultaneous' },
];

export default function NewEggPage() {
  const [flow, setFlow] = useState<FlowState>('content');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [unlockType, setUnlockType] = useState<string | null>(null);
  const [unlockValue, setUnlockValue] = useState('');
  const [unlockHint, setUnlockHint] = useState('');
  const [customId, setCustomId] = useState('');
  const [idError, setIdError] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [eggPhase, setEggPhase] = useState<'idle' | 'opening' | 'shaking'>('opening');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasContent = content.trim().length > 0 || files.length > 0;

  const getFileType = (file: File): 'image' | 'video' | 'audio' | 'pdf' | null => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf') return 'pdf';
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

  const handleEgg = async () => {
    if (!hasContent || isSubmitting) return;
    setIdError('');
    setSubmitError('');
    setIsSubmitting(true);
    
    console.log('Starting egg creation...', { content, unlockType, unlockValue, customId });

    // Phase 1: Egg appears open in center
    setFlow('locking');
    setEggPhase('opening');

    try {
      // 0. Upload files if any
      const uploadedFilePaths: string[] = [];
      for (const f of files) {
        const formData = new FormData();
        formData.append('file', f.file);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(`Failed to upload ${f.file.name}: ${err.error || 'Unknown error'}`);
        }

        const { path } = await uploadRes.json();
        uploadedFilePaths.push(path);
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          unlockType,
          unlockValue: unlockValue.trim(),
          unlockHint: unlockHint.trim(),
          customId: customId.trim(),
          files: uploadedFilePaths,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        console.error('Lock creation failed:', res.status, errorData);

        if (res.status === 409) {
          setIdError('This link ID is already taken.');
          setFlow('params');
          setEggPhase('opening');
          setIsSubmitting(false);
          return;
        }
        
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const id = data.id || customId.trim() || 'your-egg';
      const origin = typeof window !== 'undefined' ? window.location.origin : 'magicegg.heretique.fr';
      setFinalUrl(`${origin.replace('https://', '').replace('http://', '')}/${id}`);

      // Phase 2: Wait briefly, then snap shut
      setTimeout(() => {
        setEggPhase('idle');
        
        // Phase 3: Wait a moment, then shake to seal
        setTimeout(() => {
          setEggPhase('shaking');
          
          // Phase 4: Wait for animation to settle, then reveal content
          setTimeout(() => {
            setFlow('revealed');
            setEggPhase('idle');
            setIsSubmitting(false);
          }, 1200);
        }, 300);
      }, 100);

    } catch (err: any) {
      console.error('Catch block error:', err);
      setSubmitError(err.message || 'Failed to create egg. Please try again.');
      setFlow('params');
      setEggPhase('opening');
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
    setUnlockType(null);
    setUnlockValue('');
    setUnlockHint('');
    setCustomId('');
    setIdError('');
    setFinalUrl('');
    setCopied(false);
    setEggPhase('opening');
  };

  const unlockMethodMeta = {
    password: { label: 'Password', placeholder: '•••••••', inputType: 'password' },
    time: { label: 'Unlock after', placeholder: '', inputType: 'datetime-local' },
    location: { label: 'Location', placeholder: '48.8566, 2.3522', inputType: 'text' },
    simultaneous: { label: 'People (emails)', placeholder: 'alice@mail.com, bob@mail.com', inputType: 'text' },
  } as Record<string, { label: string; placeholder: string; inputType: string }>;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#f0f0f4] text-[#111111] relative font-elegant fade-in overflow-hidden">

      {/* ── Back arrow ── */}
      <div className="absolute top-6 left-6 md:top-9 md:left-9 z-10">
        {flow === 'params' ? (
          <button onClick={() => setFlow('content')} className="text-black/25 hover:text-black/60 transition-colors">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>


      {/* ════════════════════════════════════
          STEP 1 — CONTENT
      ════════════════════════════════════ */}
      {flow === 'content' && (
        <div className="flex-1 flex flex-col justify-start px-6 md:px-24 lg:px-32 pt-20 md:pt-48 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">

            {/* File chips */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {files.map((f, i) => (
                  <div key={i} className="file-preview-chip">
                    {f.type === 'image' && <img src={f.url} alt="" className="file-preview-thumb" />}
                    {f.type === 'video' && <video src={f.url} className="file-preview-thumb" />}
                    {f.type === 'pdf' && <div className="file-preview-audio">PDF</div>}
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
            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          STEP 2 — PARAMETERS
      ════════════════════════════════════ */}
      {flow === 'params' && (
        <div className="flex-1 flex flex-col justify-start px-6 md:px-24 lg:px-32 pt-20 md:pt-40 pb-32 overflow-y-auto">
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
            <div className={`method-fields-expand ${unlockType !== null && unlockType !== '' ? 'method-fields-expand--open' : ''}`}>
              <div className="flex flex-col gap-4">
                <span className="params-label">{unlockMethodMeta[unlockType ?? '']?.label ?? ''}</span>
                <input
                  key={unlockType}
                  type={unlockMethodMeta[unlockType ?? '']?.inputType ?? 'text'}
                  value={unlockValue}
                  onChange={(e) => setUnlockValue(e.target.value)}
                  placeholder={unlockMethodMeta[unlockType ?? '']?.placeholder ?? ''}
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
                <span className="text-black/25 text-2xl leading-none select-none">
                  {typeof window !== 'undefined' ? window.location.host + '/' : 'magicegg.heretique.fr/'}
                </span>
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

            {/* Content area is now top-aligned, no more central egg here */}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          LOCKING & REVEALED — Shared Center State
      ════════════════════════════════════ */}
      {(flow === 'locking' || flow === 'revealed') && (
        <div className="flex-1 relative flex items-center justify-center p-6 md:p-24 overflow-hidden">
          
          {/* Steady Egg */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="animate-in zoom-in-95 duration-200 pointer-events-auto">
              <WhiteEgg phase={eggPhase} onClick={() => {}} size={1} />
            </div>
          </div>

          {/* Message (only in revealed) */}
          {flow === 'revealed' && (
            <div className="absolute inset-x-0 bottom-20 md:bottom-auto md:top-1/2 md:pt-[170px] flex items-center justify-center pointer-events-none px-6">
              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-1000 pointer-events-auto">
                <div className="text-center flex flex-col items-center gap-1">
                  <span className="text-xl md:text-3xl font-elegant text-black/80">Your egg is ready.</span>
                  <div className="mt-5 bg-black px-6 py-2.5 rounded-full flex items-center gap-5 animate-in zoom-in-95 duration-500 delay-300">
                    <span className="text-sm md:text-lg font-elegant text-white/90 select-all cursor-text tracking-wide">
                      {finalUrl}
                    </span>
                    <button 
                      onClick={handleCopy} 
                      className="text-white hover:text-white/80 transition-colors p-1 active:scale-90"
                    >
                      {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {flow === 'revealed' && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
              <button 
                onClick={handleReset} 
                className="text-black/25 hover:text-black/60 transition-colors text-[10px] tracking-[0.4em] uppercase"
              >
                Create another egg
              </button>
            </div>
          )}
        </div>
      )}

      {flow === 'content' && (
        <div className="absolute bottom-12 left-0 right-0 z-10 flex justify-center">
          <div className="flex items-center gap-5">
            <div className="flex gap-1.5">
              <div className="rounded-full transition-all duration-300 w-4 h-1 bg-black/50" />
              <div className="rounded-full transition-all duration-300 w-1.5 h-1 bg-black/20" />
            </div>
            <button
              onClick={() => { if (hasContent) setFlow('params'); }}
              disabled={!hasContent}
              className={`transition-all duration-300 ${hasContent ? 'text-black/45 hover:text-black/80' : 'text-black/15 cursor-default'}`}
            >
              <ArrowRight size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {flow === 'params' && (
        <div className="absolute bottom-12 left-0 right-0 z-10 flex justify-center">
          <div className="flex items-center gap-6">
            <button onClick={() => setFlow('content')} className="text-black/25 hover:text-black/60 transition-colors">
              <ArrowLeft size={24} strokeWidth={1.5} />
            </button>
            <div className="w-1.5 h-1 bg-black/20 rounded-full" />
            <button 
              onClick={handleEgg} 
              disabled={isSubmitting}
              className="bg-black/50 text-[#f0f0f4] px-6 py-2.5 rounded-full text-[10px] tracking-[0.3em] uppercase hover:bg-black/70 transition-all active:scale-95 disabled:opacity-30"
            >
              LOCK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
