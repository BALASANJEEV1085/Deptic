import React from 'react';

export function CustomLoader({ className, size = 45, style, color = 'currentColor' }: { className?: string; size?: number; style?: React.CSSProperties, color?: string }) {
  return (
    <div 
      className={`loader ${className || ''}`}
      style={{
        ...style,
        fontSize: size, // use font-size to scale the em-based CSS
        color: color,
      }}
    />
  );
}
