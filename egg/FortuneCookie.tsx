"use client";

import { useState } from 'react';

interface FortuneCookieProps {
  content: string;
  isOpened: boolean;
  onOpen: () => void;
  style?: React.CSSProperties;
}

export default function FortuneCookie({ content, isOpened, onOpen, style }: FortuneCookieProps) {
  return (
    <div 
      className={`cookie-container ${isOpened ? 'opened' : ''} preserve-3d`}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        if (!isOpened) onOpen();
      }}
    >
      <div className="cookie-left" />
      <div className="cookie-right" />
      <div className="fortune-paper text-black">
        {content.startsWith('http') ? (
          <a 
            href={content} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {content}
          </a>
        ) : (
          <span>{content}</span>
        )}
      </div>
    </div>
  );
}
