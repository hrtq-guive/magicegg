"use client";

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import LockIcon from '@/components/LockIcon';

interface Post {
  id: string;
  content: string;
  unlockType?: string;
  unlockValue?: string;
  unlockHint?: string;
  createdAt: string;
}

export default function SingleLockPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [phase, setPhase] = useState<'idle' | 'unlocking' | 'gone' | 'shaking'>('idle');
  const [showText, setShowText] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [attemptValue, setAttemptValue] = useState('');
  const [shakePrompt, setShakePrompt] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: Post) => {
        setPost(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError(true);
        setIsLoading(false);
      });
  }, [params.id]);

  const handleLockClick = () => {
    if (phase !== 'idle' || !post) return;

    if (post.unlockType && post.unlockType !== '') {
      setShowPrompt(true);
      return;
    }

    triggerUnlock();
  };

  const triggerUnlock = () => {
    setPhase('shaking');
    setShowPrompt(false);

    setTimeout(() => {
      setPhase('unlocking');

      setTimeout(() => {
        setPhase('gone');
        setShowText(true);
      }, 600);
    }, 1200);
  };

  const handleAttemptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!post?.unlockValue) {
      triggerUnlock();
      return;
    }

    if (attemptValue.toLowerCase().trim() === post.unlockValue.toLowerCase().trim()) {
      triggerUnlock();
    } else {
      setShakePrompt(true);
      setAttemptValue('');
      setTimeout(() => setShakePrompt(false), 600);
    }
  };

  if (isLoading) return <div className="min-h-screen w-full bg-[#f0f0f4]"></div>;
  
  if (error || !post) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f0f0f4] text-[#111111] font-elegant text-2xl">
        <div className="mb-4">Lock not found.</div>
        <a href="/" className="text-lg text-black/40 hover:text-black/80 transition-colors">Go back</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-[#f0f0f4] text-[#111111]">
      {/* Top bar - Absolute */}
      <div className="absolute top-8 left-8 z-10">
        <a href="/" className="text-black/20 hover:text-black/50 transition-colors">
          <ArrowLeft size={20} />
        </a>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-12 md:p-24 relative">
        <div className="relative flex items-center justify-center w-full max-w-4xl">
          
          {/* The Lock */}
          {!showText && (
            <div className="absolute flex flex-col items-center justify-center">
              <LockIcon phase={phase} onClick={handleLockClick} />
              
              {/* Unlock Prompt */}
              {showPrompt && (
                <form 
                  onSubmit={handleAttemptSubmit} 
                  className={`mt-8 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500 ${shakePrompt ? 'lock-shake' : ''}`}
                >
                  {post.unlockHint && (
                    <div className="text-black/50 text-sm mb-4 font-elegant text-center">{post.unlockHint}</div>
                  )}
                  <input
                    type={post.unlockType === 'password' ? 'password' : 'text'}
                    autoFocus
                    value={attemptValue}
                    onChange={(e) => setAttemptValue(e.target.value)}
                    placeholder={post.unlockType === 'password' ? 'Enter password...' : 'Enter key...'}
                    className="input-small text-center bg-transparent border-b border-black/20 focus:border-black/50 outline-none px-4 py-2 transition-colors"
                  />
                </form>
              )}
            </div>
          )}

          {/* The Text */}
          {showText && (
            <div className="text-center text-3xl md:text-5xl font-elegant tracking-wide leading-relaxed animate-in fade-in duration-500">
              {post.content}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
