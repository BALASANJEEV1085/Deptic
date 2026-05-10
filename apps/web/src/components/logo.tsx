import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 32 }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-white", className)}
    >
      {/* Connections between cubes */}
      <path d="M60 30L90 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M90 60L60 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M60 90L30 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 60L60 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Isometric Cubes */}
      <Cube x={60} y={30} />
      <Cube x={90} y={60} />
      <Cube x={60} y={90} />
      <Cube x={30} y={60} />
    </svg>
  );
}

function Cube({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x-12}, ${y-12})`}>
      {/* Top Face */}
      <path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Right Face */}
      <path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Left Face */}
      <path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}
