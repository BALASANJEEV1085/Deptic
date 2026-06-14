"use client"

import * as React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Search as SearchIcon, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { SearchPalette } from './search-palette'

function GithubIcon({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.34 6-1.53 6-6.76a5.2 5.2 0 0 0-1.42-3.6 5.1 5.1 0 0 0-.14-3.57s-1.15-.37-3.77 1.4A13.2 13.2 0 0 0 12 3a13.2 13.2 0 0 0-3.6.48c-2.62-1.77-3.77-1.4-3.77-1.4a5.1 5.1 0 0 0-.14 3.57A5.2 5.2 0 0 0 3 12c0 5.23 3 6.42 6 6.76a4.8 4.8 0 0 0-1 3.24v4"></path>
    </svg>
  )
}

const NAV_GROUPS = [
  {
    title: 'Getting Started',
    links: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quick Start', href: '/docs/quick-start' },
      { title: 'How Deptic Works', href: '/docs/how-it-works' },
    ]
  },
  {
    title: 'Scanning',
    links: [
      { title: 'npm (Node.js)', href: '/docs/npm-scanner' },
      { title: 'pip (Python)', href: '/docs/pip-scanner' },
      { title: 'Maven (Java)', href: '/docs/maven-scanner' },
      { title: 'Go Modules', href: '/docs/go-scanner' },
    ]
  },
  {
    title: 'Vulnerabilities',
    links: [
      { title: 'CVE Detection', href: '/docs/cve-detection' },
      { title: 'Severity Levels', href: '/docs/severity-levels' },
    ]
  },
  {
    title: 'Compliance',
    links: [
      { title: 'NTIA EO14028', href: '/docs/ntia-compliance' },
      { title: 'Compliance Scoring', href: '/docs/compliance-scoring' },
    ]
  },
  {
    title: 'SBOM Export',
    links: [
      { title: 'CycloneDX 1.5', href: '/docs/cyclonedx-export' },
      { title: 'SPDX 2.3', href: '/docs/spdx-export' },
    ]
  },
  {
    title: 'Integrations',
    links: [
      { title: 'GitHub Actions CI/CD', href: '/docs/github-actions' },
      { title: 'Webhook Auto-Scan', href: '/docs/webhook-auto-scan' },
    ]
  },
  {
    title: 'API Reference',
    links: [
      { title: 'Authentication', href: '/docs/api-authentication' },
      { title: 'Scan Endpoints', href: '/docs/api-scans' },
    ]
  },
  {
    title: 'CLI Scanner',
    links: [
      { title: 'Installation & Usage', href: '/docs/cli-scanner' },
    ]
  },
  {
    title: 'Workspaces',
    links: [
      { title: 'Overview', href: '/docs/workspaces' },
    ]
  }
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [headings, setHeadings] = useState<{ id: string, title: string, level: number }[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [themeMounted, setThemeMounted] = useState(false)

  useEffect(() => setThemeMounted(true), [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Extract headings for TOC
  useEffect(() => {
    // Small delay to ensure children are mounted
    const timer = setTimeout(() => {
      const elements = Array.from(document.querySelectorAll('h2, h3'))
        .filter(el => el.id)
        .map(el => ({
          id: el.id,
          title: el.textContent || '',
          level: el.tagName === 'H2' ? 2 : 3
        }))
      setHeadings(elements)
      if (elements.length > 0) {
        setActiveId(elements[0].id)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [pathname])

  // Intersection Observer for TOC active state
  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id)
        }
      })
    }, { rootMargin: '-20% 0px -70% 0px' })

    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--lp-bg)] text-[var(--lp-text)] selection:bg-[var(--green)]/20 font-sans">
      
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[var(--lp-bg)]/95 backdrop-blur border-b border-[var(--lp-border)]">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-1.5 -ml-1.5 text-[var(--lp-text-muted)] hover:text-[var(--lp-text)]"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <Link href="/" className="flex items-center">
              <img src="/logo-light.png" alt="Deptic Logo" className="h-24 w-auto dark:hidden" />
              <img src="/logo-dark.png" alt="Deptic Logo" className="h-24 w-auto hidden dark:block" />
            </Link>
          </div>

          {/* Global Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-[480px] mx-8">
            <button 
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-2 h-9 rounded-md border border-[var(--lp-border)] bg-[var(--lp-surface)] hover:bg-[var(--lp-surface-2)] px-3 text-sm text-[var(--lp-text-muted)] transition-colors shadow-sm"
            >
              <SearchIcon size={14} />
              <span className="flex-1 text-left">Search documentation...</span>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <kbd className="rounded bg-[var(--lp-surface-2)] px-1.5 py-0.5 text-[var(--lp-text-muted)]">⌘</kbd>
                <kbd className="rounded bg-[var(--lp-surface-2)] px-1.5 py-0.5 text-[var(--lp-text-muted)]">K</kbd>
              </div>
            </button>
          </div>

          {/* Search Icon (Mobile) */}
          <button 
            className="md:hidden p-1.5 text-[var(--lp-text-muted)] hover:text-[var(--lp-text)]"
            onClick={() => setSearchOpen(true)}
          >
            <SearchIcon size={18} />
          </button>

          <div className="flex items-center gap-4">

            <button
              className="text-[var(--lp-text-muted)] hover:text-[var(--lp-text)] transition-colors"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {themeMounted && resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="max-w-[1440px] mx-auto w-full flex pt-14">
        
        {/* Left Sidebar (Desktop) */}
        <aside className="hidden lg:block w-[260px] shrink-0 border-r border-[var(--lp-border)] bg-[var(--lp-surface)] h-[calc(100vh-56px)] sticky top-14 overflow-y-auto no-scrollbar pb-10">
          <div className="p-5 flex items-center justify-between border-b border-[var(--lp-border)] mb-4">
            <span className="font-heading font-bold text-sm tracking-tight text-[var(--lp-text)]">Deptic Docs</span>
            <span className="text-[10px] font-mono font-medium text-[var(--lp-text-muted)] bg-[var(--lp-surface-2)] border border-[var(--lp-border)] rounded-full px-2 py-0.5">v1.2.0</span>
          </div>

          <nav className="px-3 pb-8">
            {NAV_GROUPS.map((group, i) => (
              <div key={i} className="mb-6">
                <h4 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--lp-text)]">
                  {group.title}
                </h4>
                <div className="flex flex-col gap-0.5">
                  {group.links.map(link => {
                    const isActive = pathname === link.href
                    return (
                      <Link 
                        key={link.href}
                        href={link.href}
                        className={`text-[13px] px-3 py-1.5 rounded transition-colors border-l-2 ${
                          isActive 
                            ? 'text-[var(--lp-text)] border-[var(--green)] bg-[var(--lp-surface-2)]/80 font-medium' 
                            : 'text-[var(--lp-text-muted)] border-transparent hover:text-[var(--lp-text)] hover:bg-[var(--lp-surface-2)]/50'
                        }`}
                      >
                        {link.title}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[280px] bg-[var(--lp-surface)] border-r border-[var(--lp-border)] shadow-2xl flex flex-col">
              <div className="h-14 border-b border-[var(--lp-border)] flex items-center justify-between px-4">
                <span className="font-heading font-bold text-sm">Deptic Docs</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 -mr-1.5 text-[var(--lp-text-muted)] hover:text-[var(--lp-text)]">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                {NAV_GROUPS.map((group, i) => (
                  <div key={i} className="mb-6">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--lp-text)]">
                      {group.title}
                    </h4>
                    <div className="flex flex-col gap-1">
                      {group.links.map(link => {
                        const isActive = pathname === link.href
                        return (
                          <Link 
                            key={link.href}
                            href={link.href}
                            className={`text-sm px-2 py-1.5 rounded transition-colors border-l-2 ${
                              isActive 
                                ? 'text-[var(--lp-text)] border-[var(--green)] bg-[var(--lp-surface-2)]' 
                                : 'text-[var(--lp-text-muted)] border-transparent'
                            }`}
                          >
                            {link.title}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex justify-center">
          <div className="w-full max-w-[760px] px-6 py-10 lg:px-16 lg:py-12 flex flex-col min-h-[calc(100vh-56px)]">
            <div className="flex-1">
              {children}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-[var(--lp-border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--lp-text-muted)]">
            </div>
          </div>
        </main>

        {/* Right Sidebar (TOC) */}
        <aside className="hidden xl:block w-[220px] shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto no-scrollbar py-12 pr-6">
          {headings.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--lp-text)] mb-3">On this page</h4>
              <ul className="flex flex-col gap-2">
                {headings.map(h => (
                  <li key={h.id} className={h.level === 3 ? 'pl-3' : ''}>
                    <a 
                      href={`#${h.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' })
                        setActiveId(h.id)
                        window.history.pushState(null, '', `#${h.id}`)
                      }}
                      className={`text-[13px] leading-snug block transition-colors ${
                        activeId === h.id ? 'text-[var(--lp-text)] font-medium' : 'text-[var(--lp-text-muted)] hover:text-[var(--lp-text)]'
                      }`}
                    >
                      {h.title}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t border-[var(--lp-border)]">
              </div>
            </div>
          )}
        </aside>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
