'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'API', href: '/#api' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Docs', href: '/docs' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-14 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-[#1a1a1a] bg-black/90 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 md:px-8">
        <a href="/" className="text-[17px] font-bold tracking-tight text-white">
          Deptic
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-sm text-[#888888] transition-colors hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-5 md:flex">
          <a
            href="/login"
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.03]"
          >
            Get started
          </a>
        </div>

        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
          className="text-white md:hidden"
        >
          {open ? <Menu className="size-6 opacity-0" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {/* mobile overlay */}
      <div
        className={`fixed inset-0 z-40 flex flex-col bg-black transition-opacity duration-300 md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex h-14 items-center justify-between px-5">
          <span className="text-[17px] font-bold tracking-tight text-white">
            Deptic
          </span>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="text-white"
          >
            <X className="size-6" />
          </button>
        </div>
        <ul className="flex flex-col gap-2 px-5 pt-8">
          {LINKS.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-2xl font-semibold text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="mt-6 flex flex-col gap-3">
            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white px-5 py-3 text-center text-base font-medium text-black"
            >
              Get started
            </a>
          </li>
        </ul>
      </div>
    </header>
  )
}
