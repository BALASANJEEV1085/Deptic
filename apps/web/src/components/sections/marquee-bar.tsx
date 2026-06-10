'use client'

const ECOSYSTEMS = ['npm', 'pip', 'Maven', 'Go', 'Rust', 'Ruby', 'PHP', '.NET']
const CVES = [
  'CVE-2021-44228',
  'CVE-2024-22262',
  'CVE-2022-23539',
  'CVE-2024-4340',
  'CVE-2023-26136',
  'CVE-2022-1471',
]

function Row({
  items,
  direction,
  duration,
  muted = false,
}: {
  items: string[]
  direction: 'left' | 'right'
  duration: number
  muted?: boolean
}) {
  const doubled = [...items, ...items, ...items, ...items]
  return (
    <div className="marquee-pause relative overflow-hidden">
      <div
        className={`marquee-track gap-3 ${
          direction === 'left' ? 'marquee-left' : 'marquee-right'
        }`}
        style={{ ['--marquee-duration' as string]: `${duration}s` }}
      >
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={`whitespace-nowrap rounded-full border border-[#1a1a1a] bg-[#111111] px-4 py-1.5 font-mono text-[13px] ${
              muted ? 'text-[#666666]' : 'text-white'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export function MarqueeBar() {
  return (
    <section className="border-y border-[#1a1a1a] bg-black py-5">
      <div className="flex flex-col gap-4">
        <Row items={ECOSYSTEMS} direction="left" duration={28} />
        <p className="text-center text-[13px] text-white">
          Scanning dependencies in real-time across every ecosystem
        </p>
        <Row items={CVES} direction="right" duration={34} muted />
      </div>
    </section>
  )
}
