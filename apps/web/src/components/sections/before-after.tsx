'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from '@/lib/use-animations'
import { AlertTriangle, Check } from 'lucide-react'

function ComparisonSlider() {
  const [pos, setPos] = useState(80)
  const [ref, inView] = useInView<HTMLDivElement>(0.3)
  const dragging = useRef(false)
  const animated = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (inView && !animated.current) {
      animated.current = true
      const start = performance.now()
      const from = 80
      const to = 50
      const tick = (now: number) => {
        const p = Math.min((now - start) / 1000, 1)
        setPos(from + (to - from) * p)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  }, [inView])

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const p = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(95, Math.max(5, p)))
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => dragging.current && updateFromClientX(e.clientX)
    const onTouch = (e: TouchEvent) =>
      dragging.current && updateFromClientX(e.touches[0].clientX)
    const onUp = () => (dragging.current = false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouch)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onUp)
    }
  }, [updateFromClientX])

  return (
    <div
      ref={(el) => {
        // @ts-expect-error - Mutating ref.current for callback ref
        containerRef.current = el
        // @ts-expect-error - Mutating ref.current for callback ref
        ref.current = el
      }}
      className="relative h-[360px] w-full select-none overflow-hidden rounded-2xl border border-[var(--lp-border)] md:h-[440px] cursor-ew-resize"
      onMouseDown={(e) => {
        dragging.current = true
        updateFromClientX(e.clientX)
      }}
      onTouchStart={(e) => {
        dragging.current = true
        updateFromClientX(e.touches[0].clientX)
      }}
    >
      {/* AFTER (full background) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--lp-surface)] p-6">
        <span className="rounded-full border border-[var(--lp-border-2)] bg-[var(--lp-surface-2)] px-3 py-1 text-xs text-[var(--lp-text)]">
          AFTER
        </span>
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface-2)] px-4 py-3">
            <span className="text-sm text-[var(--lp-text)]">Compliance score</span>
            <span className="font-heading text-lg font-bold text-[var(--lp-text)]">100/100</span>
          </div>
          {['log4j-core patched', 'lodash patched', 'axios patched'].map((t) => (
            <div key={t} className="flex items-center gap-2 text-sm text-[var(--lp-text-muted)]">
              <Check className="size-4 text-[var(--lp-text)]" />
              {t}
            </div>
          ))}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">
            <Check className="size-3.5" />
            Automated PR merged
          </div>
        </div>
      </div>

      {/* BEFORE (clipped) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--lp-bg)] p-6"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <span className="rounded-full border border-[#ff4444]/40 bg-[#ff4444]/10 px-3 py-1 text-xs text-[#ff6666]">
          BEFORE
        </span>
        <div className="mt-6 space-y-2 font-mono text-[13px]">
          <p className="text-[#ff4444]">⚠ CVE-2021-44228 unresolved</p>
          <p className="text-[#ff4444]">⚠ CVE-2024-22262 unresolved</p>
          <p className="text-[var(--lp-text-muted)]">manual_tracking.xlsx — 4 days old</p>
          <p className="text-[var(--lp-text-muted)]">visibility: 0%</p>
          <div className="mt-4 flex items-center gap-2 text-[#ff6666]">
            <AlertTriangle className="size-4" />
            <span>14 unknown dependencies</span>
          </div>
        </div>
      </div>

      {/* divider */}
      <div
        className="absolute inset-y-0 z-10 w-10 -translate-x-1/2 cursor-ew-resize"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white" />
        <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--lp-border-2)] bg-[var(--lp-bg)] text-[var(--lp-text)]">
          <span className="text-xs">↔</span>
        </span>
      </div>
    </div>
  )
}

const CARDS = [
  {
    title: 'Manual vulnerability tracking',
    body: 'Spreadsheets, stale data, and zero visibility into transitive dependencies.',
    tone: 'bg-[var(--lp-surface)] text-[var(--lp-text-muted)]',
  },
  {
    title: 'Automated CVE detection',
    body: 'Every component continuously matched against NVD and OSV.dev.',
    tone: 'bg-[var(--lp-surface-2)] text-[var(--lp-text)]',
  },
  {
    title: 'Zero CVEs shipped',
    body: 'Clean builds, signed SBOMs, and a 100/100 compliance score every release.',
    tone: 'bg-[var(--lp-surface-2)] text-[var(--lp-text)]',
  },
]

export function BeforeAfter() {
  const [ref, inView] = useInView<HTMLDivElement>(0.2)

  return (
    <section className="bg-[var(--lp-bg)] px-5 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-4xl font-bold tracking-[-0.02em] text-[var(--lp-text)] md:text-5xl">
          Before Deptic. After Deptic.
        </h2>

        <div className="mt-12">
          <ComparisonSlider />
        </div>

        <div
          ref={ref}
          className="relative mx-auto mt-16 h-64 max-w-md"
          style={{ perspective: '1200px' }}
        >
          {CARDS.map((c, i) => (
            <div
              key={c.title}
              className={`absolute inset-x-0 rounded-2xl border border-[var(--lp-border)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-700 ${c.tone}`}
              style={{
                top: inView ? `${i * 28}px` : `${i * 10}px`,
                zIndex: CARDS.length - i,
                transform: inView
                  ? `scale(${1 - i * 0.04})`
                  : `scale(${1 - i * 0.04}) translateY(20px)`,
                opacity: inView ? 1 : 0,
                transitionDelay: `${i * 0.12}s`,
              }}
            >
              <h3 className="text-lg font-bold">{c.title}</h3>
              <p className="mt-2 text-sm opacity-80">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
