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
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

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

    if (post.unlockType === 'location') {
      verifyLocation();
      return;
    }

    if (post.unlockType && post.unlockType !== '') {
      setShowPrompt(true);
      return;
    }

    triggerUnlock();
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  const verifyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsVerifyingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const target = post?.unlockValue?.split(',').map(s => parseFloat(s.trim()));

        if (!target || target.length !== 2 || isNaN(target[0]) || isNaN(target[1])) {
          setLocationError("Invalid target location stored in lock.");
          setIsVerifyingLocation(false);
          return;
        }

        const distance = getDistance(latitude, longitude, target[0], target[1]);
        const threshold = 100; // 100 meters

        if (distance <= threshold) {
          triggerUnlock();
        } else {
          setShakePrompt(true);
          setLocationError(`Too far away. (${Math.round(distance)}m from target)`);
          setTimeout(() => setShakePrompt(false), 600);
        }
        setIsVerifyingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === 1) {
          setLocationError("Location access denied. Please enable GPS.");
        } else {
          setLocationError("Could not retrieve your location.");
        }
        setIsVerifyingLocation(false);
        setShakePrompt(true);
        setTimeout(() => setShakePrompt(false), 600);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
                  {post.unlockType === 'location' ? (
                    <div className="flex flex-col items-center gap-4">
                      <button
                        onClick={(e) => { e.preventDefault(); verifyLocation(); }}
                        disabled={isVerifyingLocation}
                        className={`px-8 py-3 rounded-full border border-black/15 text-sm tracking-widest uppercase transition-all duration-300 ${isVerifyingLocation ? 'opacity-50 cursor-wait' : 'hover:bg-black hover:text-white'}`}
                      >
                        {isVerifyingLocation ? 'Verifying...' : 'Verify Location'}
                      </button>
                      {locationError && (
                        <div className="text-red-400 text-xs mt-2 text-center max-w-[200px] leading-relaxed uppercase tracking-widest">
                          {locationError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type={post.unlockType === 'password' ? 'password' : 'text'}
                      autoFocus
                      value={attemptValue}
                      onChange={(e) => setAttemptValue(e.target.value)}
                      placeholder={post.unlockType === 'password' ? 'Enter password...' : 'Enter key...'}
                      className="input-small text-center bg-transparent border-b border-black/20 focus:border-black/50 outline-none px-4 py-2 transition-colors"
                    />
                  )}
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
