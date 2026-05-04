"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, Download, Circle, MapPin, Clock } from 'lucide-react';
import WhiteEgg from '@/components/WhiteEgg';

interface Participant {
  email: string;
  is_verified: boolean;
  is_active: boolean;
}

interface Post {
  id: string;
  content: string;
  unlock_type?: string;
  unlock_value?: string;
  unlock_hint?: string;
  files?: string[];
  participants?: Participant[];
  created_at: string;
}

function EggContent({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
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
  const [currentTime, setCurrentTime] = useState(new Date());

  // Simultaneous state
  const [isRequestingLink, setIsRequestingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [allParticipantsReady, setAllParticipantsReady] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  
  // Persist resend countdown
  useEffect(() => {
    const saved = localStorage.getItem(`egg_${params.id}_resend_target`);
    if (saved) {
      const target = parseInt(saved);
      const remaining = Math.ceil((target - Date.now()) / 1000);
      if (remaining > 0) setResendCountdown(remaining);
    }
  }, [params.id]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const target = Date.now() + resendCountdown * 1000;
      localStorage.setItem(`egg_${params.id}_resend_target`, target.toString());
    } else {
      localStorage.removeItem(`egg_${params.id}_resend_target`);
    }
  }, [resendCountdown, params.id]);
  
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Not found');
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Expected JSON but got:', text.substring(0, 100));
        throw new Error('Server returned an invalid response (HTML). Check your API routes.');
      }

      const data: Post = await res.json();
      setPost(data);
      
      // Check if all are ready
      if (data.unlock_type === 'simultaneous' && data.participants && data.participants.length > 0) {
        const required = data.unlock_value?.split(',').length || 0;
        const currentReady = data.participants.filter(p => p.is_verified && p.is_active).length;
        setAllParticipantsReady(currentReady === required && required > 0);
      } else {
        setAllParticipantsReady(false);
      }
      
      return data;
    } catch (err) {
      setError(true);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
    
    // 1. Check URL params for verified email and token
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');

    if (emailParam) {
      setUserEmail(emailParam);
      localStorage.setItem(`egg_${params.id}_email`, emailParam);
    } else {
      const savedEmail = localStorage.getItem(`egg_${params.id}_email`);
      if (savedEmail) setUserEmail(savedEmail);
    }

    if (tokenParam) {
      setUserToken(tokenParam);
      localStorage.setItem(`egg_${params.id}_token`, tokenParam);
    } else {
      const savedToken = localStorage.getItem(`egg_${params.id}_token`);
      if (savedToken) setUserToken(savedToken);
    }
  }, [params.id, searchParams]);

  // Polling for simultaneous
  useEffect(() => {
    if (post?.unlock_type === 'simultaneous' && !showText) {
      pollInterval.current = setInterval(fetchPost, 3000);
    } else {
      if (pollInterval.current) clearInterval(pollInterval.current);
    }
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [post?.unlock_type, showText]);

  // Heartbeat for simultaneous
  useEffect(() => {
    if (post?.unlock_type === 'simultaneous' && userEmail && userToken && !showText) {
      const sendHeartbeat = () => {
        fetch(`/api/posts/${params.id}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, token: userToken })
        }).catch(err => console.error('Heartbeat failed:', err));
      };

      sendHeartbeat(); // Initial
      heartbeatInterval.current = setInterval(sendHeartbeat, 5000); // Every 5s for faster registration
    } else {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    }
    return () => { if (heartbeatInterval.current) clearInterval(heartbeatInterval.current); };
  }, [post?.unlock_type, userEmail, showText]);
  
  // Timer for resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setInterval(() => setResendCountdown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendCountdown]);

  // Timer for time-based lock
  useEffect(() => {
    if (post?.unlock_type === 'time' && !showText) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [post?.unlock_type, showText]);

  const isTimeReached = post?.unlock_type === 'time' && post.unlock_value && currentTime >= new Date(post.unlock_value);

  const handleEggClick = () => {
    if (phase !== 'idle' || !post) return;

    if (post.unlock_type === 'time') {
      if (isTimeReached) {
        triggerUnlock();
      } else {
        setShowPrompt(true);
      }
      return;
    }

    if (post.unlock_type === 'location') {
      setShowPrompt(true);
      // Optional: auto-verify on click
      verifyLocation();
      return;
    }

    if (post.unlock_type && post.unlock_type !== '') {
      if (post.unlock_type === 'simultaneous' && allParticipantsReady) {
        triggerUnlock();
      } else {
        setShowPrompt(true);
      }
      return;
    }

    triggerUnlock();
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
        const target = post?.unlock_value?.split(',').map(s => parseFloat(s.trim()));

        if (!target || target.length !== 2 || isNaN(target[0]) || isNaN(target[1])) {
          setLocationError("Invalid target location stored in egg.");
          setIsVerifyingLocation(false);
          return;
        }

        const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371e3;
          const φ1 = lat1 * Math.PI/180;
          const φ2 = lat2 * Math.PI/180;
          const Δφ = (lat2-lat1) * Math.PI/180;
          const Δλ = (lon2-lon1) * Math.PI/180;
          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };

        const dist = distance(latitude, longitude, target[0], target[1]);
        const threshold = 100;

        if (dist <= threshold) {
          triggerUnlock();
        } else {
          setShakePrompt(true);
          setLocationError(`Too far away. (${Math.round(dist)}m from target)`);
          setTimeout(() => setShakePrompt(false), 600);
        }
        setIsVerifyingLocation(false);
      },
      (error) => {
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
        setTimeout(() => {
          setShowText(true);
        }, 875);
      }, 300);
    }, 600); 
  };

  const handleBulkRequestLink = async () => {
    setIsRequestingLink(true);
    setRequestError('');
    
    try {
      const res = await fetch(`/api/unlock?id=${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Bulk request
      });
      
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to send magic links');
        } else {
          throw new Error('Server error (HTML). Check if the egg_participants table exists.');
        }
      }
      
      setLinkSent(true);
      setResendCountdown(60);
      localStorage.setItem(`egg_${params.id}_resend_target`, (Date.now() + 60000).toString());
    } catch (err: any) {
      setRequestError(err.message);
      setShakePrompt(true);
      setTimeout(() => setShakePrompt(false), 600);
    } finally {
      setIsRequestingLink(false);
    }
  };

  const handleAttemptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!post?.unlock_value) {
      triggerUnlock();
      return;
    }

    if (attemptValue.toLowerCase().trim() === post.unlock_value.toLowerCase().trim()) {
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
        <div className="mb-4">Egg not found.</div>
        <a href="/" className="text-lg text-black/40 hover:text-black/80 transition-colors">Go back</a>
      </div>
    );
  }

  const activeCount = post.participants?.filter(p => p.is_verified && p.is_active).length || 0;
  const totalCount = post.unlock_type === 'simultaneous' ? post.unlock_value?.split(',').length || 0 : 0;

  return (
    <div className="h-[100dvh] w-full flex relative overflow-hidden bg-[#f0f0f4] text-[#111111]">
      <div className="absolute top-8 left-8 z-10">
        <a href="/" className="text-black/20 hover:text-black/50 transition-colors">
          <ArrowLeft size={20} />
        </a>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6 md:p-24 relative overflow-y-auto">
        <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`pointer-events-auto transition-transform duration-300 ${shakePrompt ? 'egg-shake' : ''}`}>
              <WhiteEgg 
                phase={
                  phase === 'shaking' ? 'shaking' : 
                  phase === 'unlocking' ? 'opening' : 
                  phase === 'gone' ? 'gone' : 
                  'idle'
                } 
                onClick={handleEggClick} 
              />
            </div>
          </div>

          {post.unlock_type === 'simultaneous' && showPrompt && !showText && phase === 'idle' && (
            <div className="absolute inset-x-0 bottom-4 md:bottom-auto md:top-1/2 md:pt-64 flex items-center justify-center pointer-events-none px-6">
              <div className="flex flex-col items-center gap-6 pointer-events-auto animate-in fade-in duration-500">
                {post.unlock_type === 'simultaneous' && !allParticipantsReady && (
                  <button
                    onClick={handleBulkRequestLink}
                    disabled={isRequestingLink || resendCountdown > 0}
                    className={`${linkSent || userEmail ? 'text-[9px] tracking-[0.2em] uppercase text-black/40 hover:text-black/80' : 'px-8 py-3 rounded-full border border-black/15 text-[10px] tracking-[0.3em] uppercase hover:bg-black hover:text-white'} transition-all duration-300 disabled:opacity-50`}
                  >
                    {isRequestingLink ? 'Sending Keys...' : 
                     resendCountdown > 0 ? `Resend Key in ${resendCountdown}s` : 
                     (linkSent || userEmail) ? 'Resend Key' : 'Receive Key'}
                  </button>
                )}
                
                {(linkSent || userEmail) && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-black/60 text-[10px] tracking-[0.2em] uppercase">
                        {allParticipantsReady ? 'Ready. Click the egg.' : 'Waiting...'}
                      </span>
                      <div className="flex items-center gap-3 mt-2">
                        {post.participants?.map((p, i) => (
                          <div key={i} className="flex items-center gap-1.5" title={`${p.email} (${p.is_verified ? 'Verified' : 'Unverified'})`}>
                            <Circle 
                              size={8} 
                              fill={p.is_active ? '#22c55e' : p.is_verified ? '#3b82f6' : '#ef4444'} 
                              className={p.is_active ? 'text-green-500' : p.is_verified ? 'text-blue-500' : 'text-red-500'} 
                            />
                          </div>
                        ))}
                      </div>
                      <span className="text-black/25 text-[10px] mt-2 font-mono">{activeCount} / {totalCount} ACTIVE</span>
                    </div>
                      {!userEmail && (
                        <span className="text-black/30 text-[9px] uppercase tracking-widest mt-2 animate-pulse">Check your inbox</span>
                      )}
                  </div>
                )}
                {requestError && <span className="text-red-400 text-xs mt-2">{requestError}</span>}
              </div>
            </div>
          )}

          {showPrompt && !showText && post.unlock_type !== 'simultaneous' && (
            <div className="absolute inset-x-0 bottom-4 md:bottom-auto md:top-1/2 md:pt-64 flex items-center justify-center pointer-events-none px-6">
              <div className={`flex flex-col items-center pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-500 ${shakePrompt ? 'egg-shake' : ''}`}>
                
                {post.unlock_hint && (
                  <div className="text-black/50 text-sm mb-6 font-elegant text-center">{post.unlock_hint}</div>
                )}

                {post.unlock_type === 'password' && (
                  <form onSubmit={handleAttemptSubmit} className="flex flex-col items-center">
                    <input
                      type="password"
                      autoFocus
                      value={attemptValue}
                      onChange={(e) => setAttemptValue(e.target.value)}
                      placeholder="Enter password..."
                      className="input-small text-center bg-transparent border-b border-black/20 focus:border-black/50 outline-none px-4 py-2 transition-colors"
                    />
                  </form>
                )}

                {post.unlock_type === 'time' && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-black/40">
                      <Clock size={16} strokeWidth={1.5} />
                      <span className="text-[10px] tracking-[0.2em] uppercase">
                        {isTimeReached ? 'Time reached' : 'Locked until'}
                      </span>
                    </div>
                    <div className="text-xl font-elegant">
                      {new Date(post.unlock_value || '').toLocaleString([], { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </div>
                    {!isTimeReached && (
                      <span className="text-[9px] text-black/30 tracking-widest uppercase mt-2 animate-pulse">
                        Waiting for the moment...
                      </span>
                    )}
                    {isTimeReached && (
                      <button 
                        onClick={triggerUnlock}
                        className="mt-4 px-8 py-2 rounded-full border border-black/15 text-[10px] tracking-[0.3em] uppercase hover:bg-black hover:text-white transition-all duration-300"
                      >
                        Unlock Now
                      </button>
                    )}
                  </div>
                )}

                {post.unlock_type === 'location' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-black/40">
                      <MapPin size={16} strokeWidth={1.5} />
                      <span className="text-[10px] tracking-[0.2em] uppercase">Location Lock</span>
                    </div>
                    
                    <div className="text-center max-w-xs">
                      <p className="text-black/60 text-[11px] font-elegant">Be within 100m of the target to unlock.</p>
                    </div>

                    {locationError && (
                      <span className="text-red-400 text-[10px] tracking-wider uppercase">{locationError}</span>
                    )}

                    <button
                      onClick={verifyLocation}
                      disabled={isVerifyingLocation}
                      className="mt-2 px-8 py-3 rounded-full border border-black/15 text-[10px] tracking-[0.3em] uppercase hover:bg-black hover:text-white transition-all duration-300 disabled:opacity-50"
                    >
                      {isVerifyingLocation ? 'Verifying...' : 'Check Location'}
                    </button>
                  </div>
                )}

                {post.unlock_type !== 'password' && post.unlock_type !== 'time' && post.unlock_type !== 'location' && (
                  <form onSubmit={handleAttemptSubmit} className="flex flex-col items-center">
                    <input
                      type="text"
                      autoFocus
                      value={attemptValue}
                      onChange={(e) => setAttemptValue(e.target.value)}
                      placeholder="Enter key..."
                      className="input-small text-center bg-transparent border-b border-black/20 focus:border-black/50 outline-none px-4 py-2 transition-colors"
                    />
                  </form>
                )}
              </div>
            </div>
          )}

          {showText && (
            <div className="flex flex-col items-center gap-12 animate-in fade-in duration-1000 max-w-2xl px-6">
              <div className="text-center text-3xl md:text-5xl font-elegant tracking-wide leading-relaxed">
                {post.content}
              </div>
              
              {/* Attachments Section */}
              {(() => {
                const attachmentList = Array.isArray(post.files) 
                  ? post.files 
                  : (typeof post.files === 'string' && (post.files as string).startsWith('[') 
                      ? JSON.parse(post.files as string) 
                      : []);
                
                if (attachmentList.length === 0) return null;

                return (
                  <div className="w-full flex flex-col gap-4 mt-8">
                    <span className="text-[10px] tracking-[0.4em] uppercase text-black/30 text-center mb-2">Attachments</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {attachmentList.map((url: string, i: number) => {
                        const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)/i);
                        const isPDF = url.toLowerCase().endsWith('.pdf');
                        return (
                          <div key={i} className="group relative bg-white/40 border border-black/5 rounded-2xl p-4 hover:bg-white/60 transition-all flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center text-black/40">
                              {isImage ? (
                                <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : isPDF ? (
                                <FileText size={20} strokeWidth={1.5} />
                              ) : (
                                <Download size={20} strokeWidth={1.5} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-black/60 truncate font-mono">file-{i + 1}</div>
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-widest uppercase text-black/30 hover:text-black/80 transition-colors">
                                View / Download
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function SingleEggPage(props: any) {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[#f0f0f4]" />}>
      <EggContent {...props} />
    </Suspense>
  );
}
