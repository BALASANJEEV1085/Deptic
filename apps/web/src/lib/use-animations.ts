'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Reveals an element when it scrolls into view (once).
 * Adds the `is-visible` class to elements with the `reveal` class.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.1,
): RefObject<T> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold },
    )

    // observe the element itself if it has reveal, plus any descendants
    if (el.classList.contains('reveal')) observer.observe(el)
    el.querySelectorAll('.reveal').forEach((child) => observer.observe(child))

    return () => observer.disconnect()
  }, [threshold])

  return ref
}

/**
 * Returns whether the element is currently intersecting (can re-trigger).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView]
}

/**
 * Counts up to a target number when triggered.
 */
export function useCountUp(target: number, trigger: boolean, duration = 1400) {
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!trigger || started.current) return
    started.current = true
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setValue(target * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [trigger, target, duration])

  return value
}

/**
 * Tracks scroll progress (0..1) of an element through the viewport.
 * progress 0 when the element's top hits the bottom of viewport-ish,
 * 1 when its bottom passes. Best for tall pinned sections.
 */
export function useSectionProgress<T extends HTMLElement = HTMLDivElement>(): [
  RefObject<T>,
  number,
] {
  const ref = useRef<T>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const vh = window.innerHeight
        const total = rect.height - vh
        if (total <= 0) {
          setProgress(rect.top <= 0 ? 1 : 0)
          return
        }
        const scrolled = Math.min(Math.max(-rect.top, 0), total)
        setProgress(scrolled / total)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return [ref, progress]
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}
