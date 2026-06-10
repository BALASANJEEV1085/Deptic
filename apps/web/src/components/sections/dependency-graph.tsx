'use client'

import { useMemo } from 'react'
import { useInView } from '@/lib/use-animations'

interface Node {
  x: number
  y: number
  r: number
  kind: 'root' | 'clean' | 'vuln'
}

// Seeded PRNG (mulberry32) – deterministic across SSR & client
function createRng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildGraph(): { nodes: Node[]; edges: [number, number][] } {
  const rand = createRng(42)
  const nodes: Node[] = [{ x: 400, y: 300, r: 10, kind: 'root' }]
  const edges: [number, number][] = []
  const rings = [
    { count: 7, radius: 130, r: 5 },
    { count: 14, radius: 240, r: 3.5 },
  ]
  let prevStart = 0
  let prevCount = 1
  rings.forEach((ring) => {
    const start = nodes.length
    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2 + rand() * 0.3
      const radius = ring.radius + (rand() - 0.5) * 40
      const vuln = rand() < 0.18
      nodes.push({
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        r: ring.r,
        kind: vuln ? 'vuln' : 'clean',
      })
      const parent = prevStart + Math.floor(rand() * prevCount)
      edges.push([parent, start + i])
    }
    prevStart = start
    prevCount = ring.count
  })
  return { nodes, edges }
}

export function DependencyGraph() {
  const [ref, inView] = useInView<HTMLDivElement>(0.25)
  const { nodes, edges } = useMemo(buildGraph, [])

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-5">
      <div
        ref={ref}
        className="relative w-full max-w-4xl"
        style={{ perspective: '1200px' }}
      >
        <div
          className="origin-center"
          style={{
            transform: inView ? 'rotateX(8deg)' : 'rotateX(8deg) scale(0.96)',
            transition: 'transform 1.2s ease-out',
            animation: inView ? 'aurora-drift 60s linear infinite' : 'none',
          }}
        >
          <svg viewBox="0 0 800 600" className="h-auto w-full">
            {edges.map(([a, b], i) => {
              const A = nodes[a]
              const B = nodes[b]
              const len = Math.hypot(B.x - A.x, B.y - A.y)
              return (
                <line
                  key={i}
                  x1={A.x}
                  y1={A.y}
                  x2={B.x}
                  y2={B.y}
                  stroke="#333333"
                  strokeWidth="1"
                  strokeDasharray={len}
                  strokeDashoffset={inView ? 0 : len}
                  style={{
                    transition: `stroke-dashoffset 0.6s ease-out ${0.4 + (i % 14) * 0.05}s`,
                  }}
                />
              )
            })}
            {nodes.map((n, i) => (
              <circle
                key={i}
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={n.kind === 'root' ? '#ffffff' : n.kind === 'vuln' ? '#ff4444' : '#ffffff'}
                opacity={inView ? (n.kind === 'clean' ? 0.85 : 1) : 0}
                className={n.kind === 'vuln' ? 'animate-glow-pulse' : ''}
                style={{
                  transformOrigin: `${n.x}px ${n.y}px`,
                  transform: inView ? 'scale(1)' : 'scale(0.4)',
                  transition: `transform 0.4s ease-out ${(i % 14) * 0.05}s, opacity 0.4s ease-out ${(i % 14) * 0.05}s`,
                }}
              />
            ))}
          </svg>
        </div>

        <p className="mt-8 text-center font-heading text-2xl font-bold text-white md:text-3xl">
          Visualize your entire software supply chain
        </p>
      </div>
    </section>
  )
}
