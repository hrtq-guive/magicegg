"use client";

import { useState, useEffect, useRef } from 'react';

export interface WhiteEggProps {
  phase: 'idle' | 'shaking' | 'opening' | 'gone';
  onClick: () => void;
  color?: string;
  size?: number;
}

export default function WhiteEgg({ phase, onClick, color, size = 1 }: WhiteEggProps) {
  const [hoverIntensity, setHoverIntensity] = useState(0);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearInterval(hoverTimer.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (phase !== 'idle' && phase !== 'shaking') return;
    
    // Clear any existing timer just in case
    if (hoverTimer.current) clearInterval(hoverTimer.current);
    
    hoverTimer.current = setInterval(() => {
      setHoverIntensity(prev => Math.min(prev + 0.02, 2)); // Very gradual build-up
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearInterval(hoverTimer.current);
    setHoverIntensity(0);
  };

  const isInteractive = phase === 'idle' || phase === 'shaking';
  const isShakeAnim = phase === 'shaking';
  const isHovering = hoverIntensity > 0;

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`egg-wrapper ${!isInteractive ? 'pointer-events-none' : 'cursor-pointer'} ${isShakeAnim ? 'egg-shake' : ''} ${isHovering ? 'egg-hover-jiggle' : ''} ${phase === 'gone' ? 'egg-magical-out' : ''}`}
      onClick={() => {
        if (isInteractive) onClick();
      }}
      style={{ 
        transform: `scale(${size})`,
        transformOrigin: 'bottom center',
        // Pass intensity to CSS
        ...(isHovering ? { '--jiggle-intensity': hoverIntensity } : {})
      } as React.CSSProperties}
    >
      <div className={`egg-container ${phase === 'opening' || phase === 'gone' ? 'egg-cracked' : ''}`}>
        <div className="egg-left" style={color ? { backgroundColor: color } : undefined} />
        <div className="egg-right" style={color ? { backgroundColor: color } : undefined} />
      </div>
    </div>
  );
}
