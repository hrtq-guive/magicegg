"use client";

import { useEffect, useState } from 'react';

interface TypewriterProps {
  text: string;
  typingSpeed?: number;
  pauseDuration?: number;
  onComplete: () => void;
}

export default function Typewriter({ 
  text, 
  typingSpeed = 50, 
  pauseDuration = 3000, 
  onComplete 
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let index = 0;
    let typingInterval: NodeJS.Timeout;

    if (isTyping) {
      typingInterval = setInterval(() => {
        setDisplayedText((prev) => {
          const nextStr = text.slice(0, index + 1);
          index++;
          if (index >= text.length) {
            setIsTyping(false);
            clearInterval(typingInterval);
          }
          return nextStr;
        });
      }, typingSpeed);
    }

    return () => clearInterval(typingInterval);
  }, [text, typingSpeed, isTyping]);

  useEffect(() => {
    if (!isTyping) {
      const timeout = setTimeout(() => {
        onComplete();
      }, pauseDuration);
      return () => clearTimeout(timeout);
    }
  }, [isTyping, pauseDuration, onComplete]);

  return (
    <div className="relative inline-block">
      <span>{displayedText}</span>
      <span className="typewriter-cursor"></span>
    </div>
  );
}
