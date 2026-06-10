'use client'

import { useSectionProgress } from '@/lib/use-animations'

const STAGES = [
  {
    title: 'Paste any repository URL',
    sub: 'Deptic fetches every manifest file across the entire repository tree — recursively, automatically.',
  },
  {
    title: 'Full dependency resolution',
    sub: 'Every package — direct and transitive — resolved across npm, pip, Maven, Go, and more. 1,247 components in seconds.',
  },
  {
    title: 'CVE detection per component',
    sub: 'Each component matched against NVD and OSV.dev. Critical vulnerabilities flagged with exact patched versions.',
  },
  {
    title: 'Compliance report generated',
    sub: 'NTIA EO14028 and EU CRA compliance score. CycloneDX 1.5 and SPDX 2.3 export. One click.',
  },
]

function StageVisual({ stage }: { stage: number }) {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-[#1a1a1a] px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
        <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
        <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
        <span className="ml-3 font-mono text-xs text-[#666666]">
          {stage === 0 ? 'deptic — terminal' : 'deptic — dashboard'}
        </span>
      </div>

      <div className="relative h-[calc(420px-45px)] p-5">
        {/* State 0: terminal */}
        <div
          className="absolute inset-0 p-5 font-mono text-[13px] leading-6 transition-opacity duration-500"
          style={{ opacity: stage === 0 ? 1 : 0 }}
        >
          <p className="text-white">$ deptic-scan</p>
          <p className="text-[#888888]">› Fetching file tree... 2,847 files indexed</p>
          <p className="text-[#888888]">› Found package.json</p>
          <p className="text-[#888888]">› Found pom.xml</p>
          <p className="text-[#888888]">› Found go.mod</p>
          <p className="text-white">
            › Indexing<span className="animate-caret">_</span>
          </p>
        </div>

        {/* State 1: dependency build */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 transition-opacity duration-500"
          style={{ opacity: stage === 1 ? 1 : 0 }}
        >
          <p className="font-heading text-5xl font-bold text-white">1,247</p>
          <p className="text-sm text-[#888888]">components resolved</p>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="size-3 rounded-full border border-[#2a2a2a] bg-[#1a1a1a]"
              />
            ))}
          </div>
        </div>

        {/* State 2: vulnerability table */}
        <div
          className="absolute inset-0 space-y-2 p-5 transition-opacity duration-500"
          style={{ opacity: stage === 2 ? 1 : 0 }}
        >
          {[
            { n: 'log4j-core', v: '2.14.1', sev: 'CRITICAL', crit: true },
            { n: 'lodash', v: '4.17.20', sev: 'HIGH', crit: false },
            { n: 'axios', v: '0.21.1', sev: 'MEDIUM', crit: false },
            { n: 'minimist', v: '1.2.5', sev: 'MEDIUM', crit: false },
          ].map((row) => (
            <div
              key={row.n}
              className={`flex items-center justify-between rounded-md border px-3 py-2.5 ${
                row.crit
                  ? 'border-[#ff4444]/40 bg-[#ff4444]/5 animate-glow-pulse'
                  : 'border-[#1a1a1a] bg-[#111111]'
              }`}
            >
              <span className="font-mono text-[13px] text-white">{row.n}</span>
              <span className="font-mono text-xs text-[#666666]">{row.v}</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  row.crit
                    ? 'bg-[#ff4444] text-black'
                    : 'border border-[#2a2a2a] text-[#888888]'
                }`}
              >
                {row.sev}
              </span>
            </div>
          ))}
        </div>

        {/* State 3: compliance ring */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-5 transition-opacity duration-500"
          style={{ opacity: stage === 3 ? 1 : 0 }}
        >
          <div className="relative size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle cx="60" cy="60" r="52" stroke="#1a1a1a" strokeWidth="8" fill="none" />
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke="#ffffff"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={stage === 3 ? 0 : 2 * Math.PI * 52}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-3xl font-bold text-white">100</span>
              <span className="text-[10px] text-[#888888]">/ 100</span>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="rounded-md border border-[#1a1a1a] bg-[#111111] px-3 py-1.5 text-xs text-white">
              CycloneDX 1.5
            </span>
            <span className="rounded-md border border-[#1a1a1a] bg-[#111111] px-3 py-1.5 text-xs text-white">
              SPDX 2.3
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StickyStory() {
  const [ref, progress] = useSectionProgress<HTMLDivElement>()
  const stage = Math.min(3, Math.floor(progress * 3.999))

  return (
    <section ref={ref} className="relative bg-black" style={{ height: '500vh' }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* progress line */}
        <div className="absolute right-0 top-0 h-full w-[2px] bg-[#1a1a1a]">
          <div
            className="w-full bg-white"
            style={{ height: `${progress * 100}%` }}
          />
        </div>

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-[40%_60%] md:px-12">
          {/* left narrative */}
          <div className="relative h-40 md:h-48">
            {STAGES.map((s, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-all duration-500"
                style={{
                  opacity: stage === i ? 1 : 0,
                  transform:
                    stage === i
                      ? 'translateY(0)'
                      : stage > i
                        ? 'translateY(-20px)'
                        : 'translateY(20px)',
                }}
              >
                <p className="text-3xl font-bold text-white md:text-4xl">
                  {s.title}
                </p>
                <p className="mt-4 max-w-md text-base text-[#888888]">{s.sub}</p>
                <div className="mt-6 flex gap-2">
                  {STAGES.map((_, j) => (
                    <span
                      key={j}
                      className={`h-1 w-8 rounded-full transition-colors ${
                        j === stage ? 'bg-white' : 'bg-[#1a1a1a]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* right visual */}
          <StageVisual stage={stage} />
        </div>
      </div>
    </section>
  )
}
