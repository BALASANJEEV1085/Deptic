'use client'

import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function TiltCard({
  children,
  className,
  max = 8,
  spotlight = false,
}: {
  children: ReactNode
  className?: string
  max?: number
  spotlight?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rx = (py - 0.5) * -2 * max
    const ry = (px - 0.5) * 2 * max
    el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
    if (spotlight) {
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
    }
  }

  const handleLeave = () => {
    const el = ref.current
    if (el) el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        'transition-transform duration-200 ease-out [transform-style:preserve-3d]',
        className,
      )}
      style={
        spotlight
          ? ({
              backgroundImage:
                'radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.06), transparent 60%)',
            } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  )
}
