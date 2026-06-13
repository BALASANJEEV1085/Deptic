'use client'

import { useEffect, useState } from 'react'
import { useInView, useReveal } from '@/lib/use-animations'
import { KeyRound, FolderGit2, Download } from 'lucide-react'

const CURL = `curl -X POST https://api.deptic.in/v1/scan \\
  -H "Authorization: Bearer dk_live_..." \\
  -d '{ "repo": "github.com/co/app" }'`

const RESULT = [
  '{',
  '  "components": 1247,',
  '  "vulnerabilities": 3,',
  '  "compliance_score": 100,',
  '  "sbom": ["cyclonedx", "spdx", "pdf"]',
  '}',
]

function Typewriter({ text, start }: { text: string; start: boolean }) {
  const [out, setOut] = useState('')
  useEffect(() => {
    if (!start) return
    let i = 0
    const id = setInterval(() => {
      i++
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, 18)
    return () => clearInterval(id)
  }, [start, text])
  const done = out.length >= text.length
  return (
    <pre className="whitespace-pre-wrap break-all font-mono text-[13px] leading-6 text-[var(--lp-text)]">
      {out}
      {!done && <span className="animate-caret">|</span>}
    </pre>
  )
}

const POINTS = [
  {
    icon: KeyRound,
    title: 'Single-use API keys',
    body: 'Disposable keys — one scan per key for maximum security.',
  },
  {
    icon: FolderGit2,
    title: 'Scan local or remote',
    body: 'Point at a GitHub URL or a local directory. Same API.',
  },
  {
    icon: Download,
    title: 'Download PDF + CycloneDX + SPDX',
    body: 'Every export format included with every scan.',
  },
]

export function ApiSection() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3)
  const revealRef = useReveal<HTMLElement>(0.1)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setShowResult(true), 1800)
      return () => clearTimeout(t)
    }
  }, [inView])

  return (
    <section
      id="api"
      ref={revealRef}
      className="bg-[var(--lp-bg)] px-5 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 md:grid-cols-2">
        <div ref={ref}>
          <h2 className="reveal font-heading text-4xl font-bold tracking-[-0.02em] text-[var(--lp-text)] md:text-5xl">
            Built for developers
          </h2>
          <p className="reveal mt-4 max-w-md text-base text-[var(--lp-text-muted)]">
            One API call. Full SBOM analysis. Download reports programmatically.
          </p>

          {/* timeline */}
          <div className="relative mt-10 pl-8">
            <div className="absolute left-[7px] top-1 h-full w-[2px] bg-[var(--lp-surface-2)]">
              <div
                className="w-full bg-white transition-[height] duration-1000 ease-out"
                style={{ height: inView ? '100%' : '0%' }}
              />
            </div>
            <ul className="space-y-8">
              {POINTS.map((p, i) => {
                const Icon = p.icon
                return (
                  <li
                    key={p.title}
                    className="relative transition-all duration-500"
                    style={{
                      opacity: inView ? 1 : 0,
                      transform: inView ? 'translateX(0)' : 'translateX(-12px)',
                      transitionDelay: `${0.3 + i * 0.25}s`,
                    }}
                  >
                    <span className="absolute -left-[33px] top-0.5 flex size-4 items-center justify-center rounded-full border border-[var(--lp-border-2)] bg-[var(--lp-bg)]">
                      <span className="size-1.5 rounded-full bg-white" />
                    </span>
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-[var(--lp-text)]" />
                      <p className="font-medium text-[var(--lp-text)]">{p.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-[var(--lp-text-muted)]">{p.body}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* terminal */}
        <div className="scanline relative overflow-hidden rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)]">
          <div className="flex items-center gap-1.5 border-b border-[var(--lp-border)] px-4 py-3">
            <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
            <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
            <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
            <span className="ml-3 font-mono text-xs text-[var(--lp-text-muted)]">bash</span>
          </div>
          <div className="space-y-3 p-5">
            <Typewriter text={CURL} start={inView} />
            {showResult && (
              <div className="border-t border-[var(--lp-border)] pt-3">
                {RESULT.map((line, i) => (
                  <p
                    key={i}
                    className="font-mono text-[13px] leading-6 text-[var(--lp-text-muted)]"
                    style={{
                      animation: `fade-in 0.3s ease-out ${i * 0.1}s both`,
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  )
}
