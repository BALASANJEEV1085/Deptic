'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { TiltCard } from '@/components/tilt-card'
import { useReveal } from '@/lib/use-animations'

const PLANS = [
  {
    name: 'Free',
    monthly: 0,
    annual: 0,
    desc: 'For individuals getting started.',
    features: ['5 scans / month', '1 ecosystem', 'CVE detection', 'CycloneDX export'],
    cta: 'Start free',
    popular: false,
  },

  {
    name: 'Enterprise',
    monthly: 999,
    annual: 9999,
    desc: 'For organizations at scale.',
    features: [
      'Everything in Pro',
      'SSO + RBAC',
      'Auto-scan on push',
      'Vendor sharing',
      'Priority support',
    ],
    cta: 'Buy Now',
    popular: false,
  },
]

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const ref = useReveal<HTMLElement>(0.05)

  return (
    <section id="pricing" ref={ref} className="bg-[var(--lp-bg)] px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-4xl">
        <h2 className="reveal text-center font-heading text-4xl font-bold tracking-[-0.03em] text-[var(--lp-text)] md:text-5xl">
          Simple pricing
        </h2>
        <p className="reveal mt-3 text-center text-base text-[var(--lp-text-muted)]">
          Start free. Pay when you scale.
        </p>

        {/* toggle */}
        <div className="mt-8 flex items-center justify-center">
          <div className="relative flex items-center rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] p-1">
            <span
              className="absolute h-[calc(100%-8px)] rounded-full bg-white transition-transform duration-300"
              style={{
                width: 'calc(50% - 4px)',
                transform: annual ? 'translateX(100%)' : 'translateX(0)',
              }}
            />
            <button
              suppressHydrationWarning
              onClick={() => setAnnual(false)}
              className={`relative z-10 w-28 rounded-full py-1.5 text-sm font-medium transition-colors ${
                annual ? 'text-[var(--lp-text-muted)]' : 'text-black'
              }`}
            >
              Monthly
            </button>
            <button
              suppressHydrationWarning
              onClick={() => setAnnual(true)}
              className={`relative z-10 w-28 rounded-full py-1.5 text-sm font-medium transition-colors ${
                annual ? 'text-black' : 'text-[var(--lp-text-muted)]'
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {PLANS.map((plan, i) => (
            <TiltCard
              key={plan.name}
              max={6}
              className="reveal"
            >
              <div
                className={`group relative h-full rounded-2xl border bg-[var(--lp-surface)] p-6 transition-colors duration-300 ${
                  plan.popular
                    ? 'border-[var(--lp-border-2)] shadow-[0_0_40px_rgba(255,255,255,0.04)]'
                    : 'border-[var(--lp-border)] hover:border-[var(--lp-border-2)]'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-[var(--lp-text)]">{plan.name}</h3>
                <p className="mt-1 text-sm text-[var(--lp-text-muted)]">{plan.desc}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="font-heading text-4xl font-bold text-[var(--lp-text)]">
                    ₹{annual ? plan.annual : plan.monthly}
                  </span>
                  <span className="mb-1 text-sm text-[var(--lp-text-muted)]">/mo</span>
                </div>
                <a
                  href="#cta"
                  className={`mt-6 block rounded-full py-2.5 text-center text-sm font-semibold transition-transform hover:scale-[1.02] ${
                    plan.popular
                      ? 'bg-white text-black'
                      : 'border border-[var(--lp-border-2)] text-[var(--lp-text)] hover:border-[var(--lp-border-2)]'
                  }`}
                >
                  {plan.cta}
                </a>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-[var(--lp-text-muted)] transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      <Check className="size-4 shrink-0 text-[var(--lp-text)]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  )
}
