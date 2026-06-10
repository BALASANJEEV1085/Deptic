'use client'

import { useEffect, useRef, useState } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function TextScramble({
  text,
  className = '',
  delay = 0,
  duration = 800,
}: {
  text: string
  className?: string
  delay?: number
  duration?: number
}) {
  const [display, setDisplay] = useState(text)
  const frame = useRef(0)

  useEffect(() => {
    let raf = 0
    let start = 0
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduced) {
      setDisplay(text)
      return
    }

    const timeout = setTimeout(() => {
      const run = (now: number) => {
        if (!start) start = now
        const progress = Math.min((now - start) / duration, 1)
        const revealCount = Math.floor(progress * text.length)
        let out = ''
        for (let i = 0; i < text.length; i++) {
          if (text[i] === ' ') {
            out += ' '
          } else if (i < revealCount) {
            out += text[i]
          } else {
            out += CHARS[Math.floor(Math.random() * CHARS.length)]
          }
        }
        setDisplay(out)
        frame.current++
        if (progress < 1) {
          raf = requestAnimationFrame(run)
        } else {
          setDisplay(text)
        }
      }
      raf = requestAnimationFrame(run)
    }, delay)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [text, delay, duration])

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{display}</span>
    </span>
  )
}
