'use client'


import { Magnetic } from '@/components/magnetic-button'
import { useInView } from '@/lib/use-animations'

export function FinalCta() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3)

  return (
    <section
      id="cta"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-5"
    >
      {/* mesh gradient aurora */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[20%] size-[400px] rounded-full bg-[#111111] opacity-60 blur-[120px] animate-aurora" />
        <div
          className="absolute right-[10%] top-[40%] size-[360px] rounded-full bg-[#1a1a1a] opacity-50 blur-[120px] animate-aurora"
          style={{ animationDelay: '-7s' }}
        />
        <div
          className="absolute bottom-[10%] left-[40%] size-[420px] rounded-full bg-[#0d0d0d] opacity-50 blur-[120px] animate-aurora"
          style={{ animationDelay: '-13s' }}
        />
      </div>



      {/* noise */}
      <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.02]" />

      <div
        ref={ref}
        className="relative z-10 flex max-w-3xl flex-col items-center text-center transition-transform duration-1000 ease-out"
        style={{ transform: inView ? 'scale(1)' : 'scale(1.08)' }}
      >
        <h2 className="font-heading text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-white md:text-[72px]">
          Know exactly what&apos;s inside your software
        </h2>
        <p className="mt-5 text-lg text-[#888888]">
          Free to start. No credit card required.
        </p>
        <Magnetic strength={10} className="mt-9" as="a" href="/login">
          <span className="flex h-[52px] items-center rounded-full bg-white px-9 text-base font-semibold text-black transition-all duration-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]">
            Start scanning — deptic.in
          </span>
        </Magnetic>
        <p className="mt-8 font-mono text-sm text-[#666666]">
          npm · pip · Maven · Go
        </p>
      </div>
    </section>
  )
}
