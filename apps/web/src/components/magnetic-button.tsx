'use client'

import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Magnetic({
  children,
  className,
  strength = 8,
  as: Tag = 'button',
  ...props
}: {
  children: ReactNode
  className?: string
  strength?: number
  as?: 'button' | 'a' | 'div'
} & React.HTMLAttributes<HTMLElement> &
  Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null)

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - (rect.left + rect.width / 2)
    const y = e.clientY - (rect.top + rect.height / 2)
    const max = strength
    el.style.transform = `translate(${(x / rect.width) * max * 2}px, ${
      (y / rect.height) * max * 2
    }px)`
  }

  const handleLeave = () => {
    const el = ref.current
    if (el) el.style.transform = 'translate(0px, 0px)'
  }

  const Comp = Tag as any
  return (
    <Comp
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn('magnetic inline-block transition-transform duration-200 ease-out', className)}
      {...props}
    >
      {children}
    </Comp>
  )
}
