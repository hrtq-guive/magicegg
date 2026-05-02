"use client";

import { useEffect, useState, useCallback } from 'react';
import { Play, PlusCircle, Music, Share2, Sun, Info } from 'lucide-react';
import WhiteEgg from '@/components/WhiteEgg';

interface Post {
  id: string;
  content: string;
  createdAt: string;
}

export default function OutputPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [eggPhase, setEggPhase] = useState<'idle' | 'shaking' | 'opening'>('idle');
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then((data: Post[]) => {
        const initialPosts = data.length > 0 ? data : [
          { id: '1', content: 'We should be talking about new technologies.', createdAt: '' }
        ];
        setPosts(initialPosts);
        setIsLoading(false);
      });
  }, []);

  const handleEggClick = () => {
    if (eggPhase !== 'idle') return;
    setEggPhase('shaking');
    
    // After shake, crack open + fade text in simultaneously
    setTimeout(() => {
      setEggPhase('opening');
      setShowText(true);
    }, 1200);

    // Auto-advance after reading time
    setTimeout(() => {
      handleNextPost();
    }, 1200 + 6000);
  };

  const handleNextPost = useCallback(() => {
    setIsFadingOut(true);
    
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % posts.length);
      setEggPhase('idle');
      setShowText(false);
      setIsFadingOut(false);
    }, 1250);
  }, [posts.length]);

  if (isLoading) return null;

  const currentPost = posts[currentIndex];

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-[#f0f0f4] text-[#111111]">
      
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-12 md:p-24 relative">
        
        <div className={`relative flex items-center justify-center w-full max-w-4xl transition-opacity duration-[1250ms] ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
          
          {/* The Egg */}
          <div className={`absolute flex items-center justify-center transition-opacity duration-[800ms] ${showText ? 'opacity-0' : 'opacity-100'}`}>
            <WhiteEgg phase={eggPhase} onClick={handleEggClick} />
          </div>

          {/* The Text */}
          <div className={`text-center text-3xl md:text-5xl font-elegant tracking-wide leading-relaxed transition-opacity duration-[1200ms] ${showText ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {currentPost.content}
          </div>

        </div>
      </div>

      {/* Right Sidebar Icons */}
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 flex flex-col justify-between py-12 items-center text-black/20">
        <div className="flex flex-col gap-8 mt-12">
          <button className="hover:opacity-60 transition-opacity"><Play size={18} /></button>
          <a href="/newlock" className="hover:opacity-60 transition-opacity"><PlusCircle size={18} /></a>
          <button className="hover:opacity-60 transition-opacity"><Music size={18} /></button>
          <button className="hover:opacity-60 transition-opacity"><Share2 size={18} /></button>
          <button className="hover:opacity-60 transition-opacity"><Sun size={18} /></button>
        </div>

        <div className="mb-12">
          <button className="hover:opacity-60 transition-opacity"><Info size={18} /></button>
        </div>
      </div>

    </div>
  );
}
