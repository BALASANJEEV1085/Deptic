'use client'

import { useSectionProgress, useMediaQuery } from '@/lib/use-animations'
import { ArrowRight } from 'lucide-react'

const PANELS = [
  {
    num: '01',
    kicker: 'Connect',
    title: 'Paste a URL or run deptic-scan',
    body: 'Point Deptic at any public or private repository. No setup, no agents, no config files.',
    visual: 'connect',
  },
  {
    num: '02',
    kicker: 'Detect',
    title: 'Every manifest found automatically',
    body: 'package.json, pom.xml, go.mod, requirements.txt — discovered recursively across the entire tree.',
    visual: 'detect',
  },
  {
    num: '03',
    kicker: 'Analyze',
    title: 'Full dependency tree resolved',
    body: 'Direct and transitive dependencies resolved and graphed. 1,247 components in seconds.',
    visual: 'analyze',
  },
  {
    num: '04',
    kicker: 'Report',
    title: 'Compliance report in seconds',
    body: 'Compliance score, CVE summary, and exportable SBOM — ready to share or download.',
    visual: 'report',
  },
]

function PanelVisual({ kind }: { kind: string }) {
  if (kind === 'connect') {
    return (
      <div className="flex h-14 w-full max-w-md items-center rounded-full border border-[#2a2a2a] bg-[#1a1a1a] pl-6 pr-1.5">
        <span className="flex-1 truncate font-mono text-sm text-white">
          https://github.com/company/backend<span className="animate-caret">|</span>
        </span>
        <span className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black">
          Scan
        </span>
      </div>
    )
  }
  if (kind === 'detect') {
    return (
      <div className="w-full max-w-sm rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4 font-mono text-[13px]">
        <p className="text-[#666666]">backend/</p>
        <p className="pl-4 text-white">├─ package.json ✓</p>
        <p className="pl-4 text-[#888888]">├─ src/</p>
        <p className="pl-4 text-white">├─ pom.xml ✓</p>
        <p className="pl-4 text-white">└─ go.mod ✓</p>
      </div>
    )
  }
  if (kind === 'analyze') {
    return (
      <div className="relative flex h-56 w-56 items-center justify-center">
        <svg viewBox="0 0 200 200" className="absolute inset-0 size-full">
          {[
            [100, 100, 40, 30],
            [100, 100, 160, 40],
            [100, 100, 100, 170],
            [100, 100, 30, 150],
            [40, 30, 20, 80],
            [160, 40, 180, 100],
          ].map(([x1, y1, x2, y2], i) => (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#333333"
              strokeWidth="1"
            />
          ))}
          {[
            [100, 100, 5, '#fff'],
            [40, 30, 3, '#888'],
            [160, 40, 3, '#888'],
            [100, 170, 3, '#888'],
            [30, 150, 3, '#888'],
            [20, 80, 2.5, '#666'],
            [180, 100, 2.5, '#666'],
          ].map(([cx, cy, r, c], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={c as string} />
          ))}
        </svg>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-heading text-lg font-bold text-white">
          1,247 deps
        </div>
      </div>
    )
  }
  // report
  return (
    <div className="grid w-full max-w-sm grid-cols-2 gap-3">
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <p className="font-heading text-2xl font-bold text-white">100</p>
        <p className="text-xs text-[#888888]">compliance score</p>
      </div>
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <p className="font-heading text-2xl font-bold text-white">3</p>
        <p className="text-xs text-[#888888]">CVEs patched</p>
      </div>
      <div className="col-span-2 flex gap-2">
        <span className="flex-1 rounded-lg bg-white py-2 text-center text-xs font-semibold text-black">
          Export PDF
        </span>
        <span className="flex-1 rounded-lg border border-[#2a2a2a] py-2 text-center text-xs text-white">
          CycloneDX
        </span>
      </div>
    </div>
  )
}

function Panel({ panel }: { panel: (typeof PANELS)[number] }) {
  return (
    <div className="flex w-screen shrink-0 items-center justify-center px-6 md:px-20">
      <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div>
          <span className="font-mono text-sm text-[#666666]">{panel.num}</span>
          <p className="mt-2 text-sm uppercase tracking-widest text-[#888888]">
            {panel.kicker}
          </p>
          <h3 className="mt-4 font-heading text-3xl font-bold tracking-[-0.02em] text-white md:text-5xl">
            {panel.title}
          </h3>
          <p className="mt-4 max-w-md text-base text-[#888888]">{panel.body}</p>
        </div>
        <div className="flex items-center justify-center">
          <PanelVisual kind={panel.visual} />
        </div>
      </div>
    </div>
  )
}

export function HorizontalScroll() {
  const [ref, progress] = useSectionProgress<HTMLDivElement>()
  const isMobile = useMediaQuery('(max-width: 767px)')

  if (isMobile) {
    return (
      <section className="bg-black">
        {PANELS.map((p) => (
          <div key={p.num} className="flex min-h-[80vh] items-center border-b border-[#1a1a1a]">
            <Panel panel={p} />
          </div>
        ))}
      </section>
    )
  }

  return (
    <section ref={ref} className="relative bg-black" style={{ height: '400vh' }}>
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        {/* progress bar */}
        <div className="absolute left-0 top-0 z-10 h-[2px] w-full bg-[#1a1a1a]">
          <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
        </div>
        <div
          className="flex h-full"
          style={{ transform: `translateX(-${progress * 300}vw)` }}
        >
          {PANELS.map((p) => (
            <Panel key={p.num} panel={p} />
          ))}
        </div>
        <div className="absolute bottom-8 right-8 flex items-center gap-2 text-[#666666]">
          <span className="text-xs">scroll</span>
          <ArrowRight className="size-4" />
        </div>
      </div>
    </section>
  )
}
