'use client'

import { useEffect, useState } from 'react'
import { TextScramble } from '@/components/text-scramble'
import { Magnetic } from '@/components/magnetic-button'
import { useCountUp } from '@/lib/use-animations'

function TrustStat({
  value,
  suffix = '',
  label,
  trigger,
}: {
  value: number
  suffix?: string
  label: string
  trigger: boolean
}) {
  const n = useCountUp(value, trigger, 1200)
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-xl font-semibold text-[var(--lp-text)] md:text-2xl">
        {Math.round(n).toLocaleString()}
        {suffix}
      </span>
      <span className="mt-1 text-xs text-[var(--lp-text-muted)] md:text-sm">{label}</span>
    </div>
  )
}

export function Hero() {
  const [mounted, setMounted] = useState(false)
  const [subVisible, setSubVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => setSubVisible(true), 900)
    return () => clearTimeout(t)
  }, [])

  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--lp-bg)] px-5"
    >
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center pt-20 text-center">
        {/* pill badge */}
        <div
          className="mb-8 flex items-center gap-2 rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3.5 py-1.5 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(8px)',
            transitionDelay: '0.3s',
          }}
        >
          <span className="size-1.5 rounded-full bg-white animate-dot-pulse" />
          <span className="text-xs text-[var(--lp-text)]">Now supporting 4 ecosystems</span>
        </div>

        {/* H1 */}
        <h1 className="font-heading text-[22px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[var(--lp-text)] sm:text-[28px] md:text-[38px]">
          <span className="block">
            <TextScramble text="SBOM Intelligence for Modern" delay={250} duration={700} />
          </span>
          <span className="block">
            <TextScramble
              text="Engineering Teams"
              delay={650}
              duration={800}
            />
          </span>
        </h1>

        <p
          className="mt-6 max-w-[560px] text-base text-[var(--lp-text-muted)] transition-opacity duration-700 md:text-lg"
          style={{ opacity: subVisible ? 1 : 0 }}
        >
          Gain complete visibility into dependencies, vulnerabilities, and
          compliance risks.
        </p>

        {/* search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const url = new FormData(e.currentTarget).get('repoUrl') as string;
            const nextPath = encodeURIComponent('/dashboard/projects/new' + (url ? `?repoUrl=${encodeURIComponent(url)}` : ''));
            window.location.href = `/login?next=${nextPath}`;
          }}
          className="mt-9 w-[90vw] max-w-[560px] transition-all duration-700"
          style={{
            opacity: subVisible ? 1 : 0,
            transform: subVisible ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          <div className="flex h-14 items-center rounded-full border border-[var(--lp-border-2)] bg-[var(--lp-surface-2)] pl-6 pr-1.5">
            <input
              name="repoUrl"
              type="text"
              placeholder="Enter repository url to scan"
              aria-label="Repository URL"
              className="h-full flex-1 bg-transparent text-[15px] text-[var(--lp-text)] placeholder:text-[var(--lp-text-muted)] focus:outline-none"
            />
            <Magnetic strength={8} type="submit">
              <span className="flex h-11 items-center rounded-full bg-white px-7 text-[15px] font-semibold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]">
                Scan
              </span>
            </Magnetic>
          </div>
        </form>

        {/* trust indicators */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          <TrustStat value={10000} suffix="+" label="components scanned" trigger={subVisible} />
          <TrustStat value={814} label="CVEs detected" trigger={subVisible} />
          <div className="flex flex-col items-center text-center">
            <span className="text-xl font-semibold text-[var(--lp-text)] md:text-2xl">100%</span>
            <span className="mt-1 text-xs text-[var(--lp-text-muted)] md:text-sm">free to start</span>
          </div>
        </div>
      </div>

      {/* scroll indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <svg width="2" height="40" viewBox="0 0 2 40" aria-hidden="true">
          <line
            x1="1"
            y1="0"
            x2="1"
            y2="40"
            stroke="white"
            strokeWidth="1"
            strokeDasharray="40"
            strokeDashoffset="40"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="40"
              to="-40"
              dur="2s"
              repeatCount="indefinite"
            />
          </line>
        </svg>
        <span className="text-[11px] text-[var(--lp-text-muted)]">scroll</span>
      </div>
    </section>
  )
}
