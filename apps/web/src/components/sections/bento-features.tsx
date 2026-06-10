'use client'

import { Check, GitPullRequest, FileText, Boxes, Layers } from 'lucide-react'
import { TiltCard } from '@/components/tilt-card'
import { useReveal, useInView, useCountUp } from '@/lib/use-animations'

const ECOSYSTEMS = ['npm', 'pip', 'Maven', 'Go']
const COMPLIANCE = [
  'Component name',
  'Version string',
  'Unique identifier',
  'Dependency relationship',
  'Author of component',
  'Timestamp',
  'Hash of component',
]

function VulnTable() {
  const rows = [
    { n: 'log4j-core', sev: 'CRITICAL', crit: true },
    { n: 'lodash', sev: 'HIGH', crit: false },
    { n: 'axios', sev: 'MEDIUM', crit: false },
    { n: 'minimist', sev: 'LOW', crit: false },
  ]
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div
          key={r.n}
          className={`flex items-center justify-between rounded-md border px-3 py-2.5 ${
            r.crit
              ? 'border-[#ff4444]/40 bg-[#ff4444]/5 animate-glow-pulse'
              : 'border-[#1a1a1a] bg-[#111111]'
          }`}
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <span className="font-mono text-[13px] text-white">{r.n}</span>
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
              r.crit ? 'bg-[#ff4444] text-black' : 'border border-[#2a2a2a] text-[#888888]'
            }`}
          >
            {r.sev}
          </span>
        </div>
      ))}
    </div>
  )
}

function RepoCounter() {
  const [ref, inView] = useInView<HTMLDivElement>()
  const n = useCountUp(12, inView, 1400)
  return (
    <div ref={ref} className="flex items-center gap-4">
      <div className="flex -space-x-3">
        {['#1a1a1a', '#2a2a2a', '#333333', '#222222'].map((c, i) => (
          <span
            key={i}
            className="flex size-9 items-center justify-center rounded-full border-2 border-black text-xs font-bold text-white"
            style={{ background: c }}
          >
            {String.fromCharCode(65 + i)}
          </span>
        ))}
      </div>
      <div>
        <p className="font-heading text-2xl font-bold text-white">
          {Math.round(n)}
        </p>
        <p className="text-xs text-[#888888]">repositories monitored</p>
      </div>
    </div>
  )
}

const cardBase =
  'group relative overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 transition-colors duration-300 hover:border-[#333333]'

export function BentoFeatures() {
  const ref = useReveal<HTMLElement>(0.05)

  return (
    <section id="features" ref={ref} className="bg-black px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="reveal text-center font-heading text-4xl font-bold tracking-[-0.03em] md:text-5xl">
          <span className="text-white">Everything compliance requires.</span>{' '}
          <span className="text-[#888888]">Nothing it doesn&apos;t.</span>
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-2">
          {/* Card 1 - large */}
          <TiltCard className="reveal md:col-span-7 md:row-span-2">
            <div className={`${cardBase} h-full`}>
              <h3 className="text-xl font-bold text-white">Real-time CVE detection</h3>
              <p className="mt-2 max-w-sm text-sm text-[#888888]">
                Every component matched against NVD and OSV.dev. Critical
                vulnerabilities flagged instantly with exact patched versions.
              </p>
              <div className="mt-6">
                <VulnTable />
              </div>
            </div>
          </TiltCard>

          {/* Card 2 - NTIA */}
          <TiltCard className="reveal md:col-span-5">
            <div className={`${cardBase} h-full`}>
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-white">NTIA Compliance</h3>
                <span className="flex size-10 items-center justify-center rounded-full border border-[#2a2a2a] text-xs font-bold text-white">
                  7/7
                </span>
              </div>
              <ul className="mt-4 space-y-1.5">
                {COMPLIANCE.map((c, i) => (
                  <li key={c} className="flex items-center gap-2 text-[13px] text-[#888888]">
                    <Check
                      className="size-3.5 text-white"
                      style={{ animationDelay: `${i * 0.08}s` }}
                    />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </TiltCard>

          {/* Card 3 - export formats */}
          <TiltCard className="reveal md:col-span-5">
            <div className={`${cardBase} h-full`}>
              <h3 className="text-lg font-bold text-white">Export formats</h3>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {['CycloneDX 1.5', 'SPDX 2.3', 'PDF Report'].map((f) => (
                  <div
                    key={f}
                    className="flex flex-col items-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#111111] p-4 transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(255,255,255,0.06)]"
                  >
                    <FileText className="size-6 text-white" />
                    <span className="text-xs text-[#888888]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </TiltCard>

          {/* Card 4 - Fix with PR */}
          <TiltCard className="reveal md:col-span-4 md:row-span-2">
            <div className={`${cardBase} h-full`}>
              <div className="flex items-center gap-2">
                <GitPullRequest className="size-5 text-white" />
                <h3 className="text-lg font-bold text-white">Fix with PR</h3>
              </div>
              <div className="mt-4 space-y-1 rounded-lg border border-[#1a1a1a] bg-[#111111] p-3 font-mono text-xs">
                <p className="text-[#ff4444]">- &quot;log4j-core&quot;: &quot;2.14.1&quot;</p>
                <p className="text-white">+ &quot;log4j-core&quot;: &quot;2.17.1&quot;</p>
                <p className="text-[#ff4444]">- &quot;lodash&quot;: &quot;4.17.20&quot;</p>
                <p className="text-white">+ &quot;lodash&quot;: &quot;4.17.21&quot;</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#111111] px-3 py-1 text-xs text-white">
                <Check className="size-3.5" />3 vulnerabilities patched
              </span>
            </div>
          </TiltCard>

          {/* Card 5 - ecosystems spotlight */}
          <TiltCard className="reveal md:col-span-4">
            <div className={`${cardBase} h-full`}>
              <div className="flex items-center gap-2">
                <Boxes className="size-5 text-white" />
                <h3 className="text-lg font-bold text-white">4 ecosystems</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {ECOSYSTEMS.map((e) => (
                  <span
                    key={e}
                    className="rounded-md border border-[#1a1a1a] bg-[#111111] py-2 text-center font-mono text-xs text-white"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </TiltCard>

          {/* Card 6 - multi-repo */}
          <TiltCard className="reveal md:col-span-4">
            <div className={`${cardBase} h-full`}>
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-white" />
                <h3 className="text-lg font-bold text-white">Workspace</h3>
              </div>
              <div className="mt-6">
                <RepoCounter />
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  )
}
