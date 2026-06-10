'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useCountUp } from '@/lib/use-animations'

function Metric({
  value,
  suffix,
  label,
  trigger,
}: {
  value: number
  suffix: string
  label: string
  trigger: boolean
}) {
  const n = useCountUp(value, trigger, 1500)
  return (
    <div className="flex flex-col items-center text-center">
      <span className="font-heading text-6xl font-bold tracking-[-0.02em] text-white md:text-[96px]">
        {Math.round(n).toLocaleString()}
        {suffix}
      </span>
      <span className="mt-2 text-base text-[#888888]">{label}</span>
    </div>
  )
}

export function Metrics() {
  const [ref, inView] = useInView<HTMLDivElement>(0.2)
  const [offset, setOffset] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const center = rect.top + rect.height / 2 - window.innerHeight / 2
      setOffset(center)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-black px-5 py-28 md:py-32"
    >
      {/* parallax grid bg */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          transform: `translateY(${offset * -0.1}px)`,
        }}
      />
      <div
        ref={ref}
        className="relative mx-auto grid max-w-6xl grid-cols-1 gap-16 md:grid-cols-3"
        style={{ transform: `translateY(${offset * -0.06}px)` }}
      >
        <Metric value={10358} suffix="+" label="components scanned" trigger={inView} />
        <Metric value={814} suffix="" label="CVEs detected" trigger={inView} />
        <Metric value={100} suffix="%" label="compliance achievable" trigger={inView} />
      </div>
    </section>
  )
}
