'use client'

import { useSectionProgress } from '@/lib/use-animations'
import { Boxes, GitPullRequest, ShieldCheck, Share2, Webhook } from 'lucide-react'

const FEATURES = [
  {
    name: 'Multi-ecosystem scanning',
    icon: Boxes,
    desc: 'Detect manifests across npm, pip, Maven, and Go simultaneously — one unified scan.',
    tags: ['npm', 'pip', 'Maven', 'Go'],
  },
  {
    name: 'Fix with PR',
    icon: GitPullRequest,
    desc: 'Generate a pull request that patches every vulnerable dependency to a safe version.',
    tags: ['diff', 'merge', 'patched'],
  },
  {
    name: 'NTIA Compliance',
    icon: ShieldCheck,
    desc: 'Automatically validate all seven NTIA minimum elements and produce a score.',
    tags: ['EO 14028', 'EU CRA', '7/7'],
  },
  {
    name: 'Vendor Sharing',
    icon: Share2,
    desc: 'Share a read-only report link with vendors — no login required.',
    tags: ['link', 'email', 'no login'],
  },
  {
    name: 'Auto-scan on push',
    icon: Webhook,
    desc: 'Connect a webhook so every push triggers a fresh scan and notification.',
    tags: ['push', 'webhook', 'notify'],
  },
]

function PanelMock({ index }: { index: number }) {
  const f = FEATURES[index]
  const Icon = f.icon
  return (
    <div className="flex h-full w-full flex-col justify-center rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface)] p-8">
      <Icon className="size-8 text-[var(--lp-text)]" />
      <h3 className="mt-5 font-heading text-2xl font-bold text-[var(--lp-text)] md:text-3xl">
        {f.name}
      </h3>
      <p className="mt-3 max-w-sm text-base text-[var(--lp-text-muted)]">{f.desc}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {f.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface-2)] px-3 py-1 font-mono text-xs text-[var(--lp-text)]"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

export function FeatureWalkthrough() {
  const [ref, progress] = useSectionProgress<HTMLDivElement>()
  const active = Math.min(FEATURES.length - 1, Math.floor(progress * (FEATURES.length - 0.001)))

  return (
    <section ref={ref} className="relative bg-[var(--lp-bg)]" style={{ height: '400vh' }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-6 md:px-12">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 md:grid-cols-[36%_64%]">
          {/* sticky sidebar list */}
          <ul className="hidden flex-col gap-1 md:flex">
            {FEATURES.map((f, i) => (
              <li
                key={f.name}
                className={`border-l-[3px] py-3 pl-5 text-lg font-medium transition-colors duration-300 ${
                  active === i
                    ? 'border-white text-[var(--lp-text)]'
                    : 'border-transparent text-[var(--lp-text-muted)]'
                }`}
              >
                {f.name}
              </li>
            ))}
          </ul>

          {/* mobile active label */}
          <p className="text-sm text-[var(--lp-text-muted)] md:hidden">
            {active + 1} / {FEATURES.length} — {FEATURES[active].name}
          </p>

          {/* right panels crossfade */}
          <div className="relative h-[360px] md:h-[440px]">
            {FEATURES.map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: active === i ? 1 : 0, pointerEvents: active === i ? 'auto' : 'none' }}
              >
                <PanelMock index={i} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
