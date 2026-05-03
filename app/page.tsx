"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WhiteEgg from '@/components/WhiteEgg';

export default function LandingPage() {
  const [phase, setPhase] = useState<'idle' | 'opening' | 'shaking' | 'gone'>('idle');
  const [isOpeningSequence, setIsOpeningSequence] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const router = useRouter();

  const sentences = [
    "This is your egg.",
    "Put something inside.",
    "Lock it and send it."
  ];

  // Start text reveal immediately upon landing
  useEffect(() => {
    // Reveal first line instantly
    if (visibleCount === 0) {
      setVisibleCount(1);
    } else if (visibleCount < sentences.length) {
      // Reveal subsequent lines with very short delay
      const timer = setTimeout(() => {
        setVisibleCount(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, sentences.length]);

  // Occasional inviting shake
  useEffect(() => {
    if (visibleCount === sentences.length && phase === 'idle' && !isOpeningSequence) {
      const timer = setTimeout(() => {
        setPhase('shaking');
        setTimeout(() => setPhase('idle'), 1000);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, phase, sentences.length, isOpeningSequence]);

  const handleEggClick = () => {
    if (isOpeningSequence) return;
    
    // Immediate state change to hide text and start sequence
    setIsOpeningSequence(true);
    setPhase('shaking');
    
    // Fluid continuous animation flow
    setTimeout(() => {
      setPhase('opening');
      
      setTimeout(() => {
        setPhase('gone');
        
        // Navigate after the flow has completed its visual peak
        setTimeout(() => {
          router.push('/newegg');
        }, 1500);
      }, 300);
    }, 600); 
  };

  const showInstructions = !isOpeningSequence;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#f0f0f4] text-[#111111] font-elegant relative overflow-hidden">
      
      {/* Centered Egg - Exact same spot as opening page */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <WhiteEgg 
            phase={phase} 
            onClick={handleEggClick} 
            size={1} 
          />
        </div>
      </div>

      {/* Sequential Text below the center */}
      {showInstructions && (
        <div className="absolute inset-x-0 bottom-48 md:bottom-auto md:top-[50%] md:pt-40 pointer-events-none px-6">
          <div className="flex flex-col items-center text-center gap-2">
            {sentences.slice(0, visibleCount).map((s, idx) => (
              <p 
                key={idx} 
                className="text-xl md:text-2xl text-black/60 leading-relaxed font-light animate-in fade-in duration-100"
              >
                {s}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Footer Note - Very bottom */}
      {showInstructions && visibleCount === sentences.length && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none animate-in fade-in duration-1000 delay-500">
          <span className="text-[10px] text-black/15 uppercase tracking-[0.4em]">
            No account needed. Just intent.
          </span>
        </div>
      )}

    </div>
  );
}
