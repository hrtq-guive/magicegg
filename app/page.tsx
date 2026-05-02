"use client";

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f0f0f4] text-[#111111] px-8 font-elegant">
      
      <div className="max-w-3xl w-full flex flex-col items-center text-center gap-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* Concept Title */}
        <h1 className="text-6xl md:text-8xl tracking-tight leading-[0.9] font-medium">
          Chaosbox
        </h1>

        {/* Concept Description */}
        <p className="text-xl md:text-2xl text-black/50 max-w-xl leading-relaxed">
          Create time-capsules for your digital life. 
          Lock messages, URLs, or files behind conditions only you control. 
          Share the link, and they'll wait for the reveal.
        </p>

        {/* Call to Action */}
        <div className="flex flex-col items-center gap-6 mt-4">
          <Link 
            href="/newlock" 
            className="group flex items-center gap-4 px-10 py-5 bg-black text-[#f0f0f4] rounded-full text-lg tracking-wider uppercase hover:scale-105 transition-all duration-300 shadow-xl shadow-black/5"
          >
            Create a Lock
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <span className="text-sm text-black/20 uppercase tracking-[0.2em]">
            No account needed. Just intent.
          </span>
        </div>

      </div>

      {/* Footer Decoration */}
      <div className="absolute bottom-12 text-black/10 text-sm tracking-widest uppercase">
        Locked with care.
      </div>

    </div>
  );
}
