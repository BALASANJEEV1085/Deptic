"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, FileText, CornerDownLeft } from 'lucide-react'

interface DocPage {
  title: string
  section: string
  href: string
  description: string
  keywords: string[]
}

const DOC_PAGES: DocPage[] = [
  { title: 'Introduction', section: 'Getting Started', href: '/docs', description: 'Overview of Deptic platform', keywords: ['overview','intro','what is deptic','sbom','supply chain'] },
  { title: 'Quick Start', section: 'Getting Started', href: '/docs/quick-start', description: 'Scan your first repository in 2 minutes', keywords: ['quick start','getting started','first scan','setup','account'] },
  { title: 'How Deptic Works', section: 'Getting Started', href: '/docs/how-it-works', description: 'Architecture and scanning pipeline', keywords: ['architecture','pipeline','how','works'] },
  { title: 'npm (Node.js)', section: 'Scanning', href: '/docs/npm-scanner', description: 'npm dependency resolution and scanning', keywords: ['npm','node','nodejs','package.json','javascript'] },
  { title: 'pip (Python)', section: 'Scanning', href: '/docs/pip-scanner', description: 'Python dependency scanning', keywords: ['pip','python','requirements.txt','pypi'] },
  { title: 'Maven (Java)', section: 'Scanning', href: '/docs/maven-scanner', description: 'Java Maven dependency scanning', keywords: ['maven','java','pom.xml','spring'] },
  { title: 'Go Modules', section: 'Scanning', href: '/docs/go-scanner', description: 'Go module dependency scanning', keywords: ['go','golang','go.mod'] },
  { title: 'CVE Detection', section: 'Vulnerabilities', href: '/docs/cve-detection', description: 'How vulnerability matching works', keywords: ['cve','vulnerability','osv','nvd','security'] },
  { title: 'Severity Levels', section: 'Vulnerabilities', href: '/docs/severity-levels', description: 'Critical, High, Medium, Low classifications', keywords: ['severity','critical','high','medium','low','cvss'] },
  { title: 'NTIA EO14028', section: 'Compliance', href: '/docs/ntia-compliance', description: 'US Executive Order 14028 compliance scoring', keywords: ['ntia','eo14028','executive order','compliance','federal'] },
  { title: 'Compliance Scoring', section: 'Compliance', href: '/docs/compliance-scoring', description: 'How compliance scores are calculated', keywords: ['scoring','algorithm','score','calculation'] },
  { title: 'CycloneDX 1.5', section: 'SBOM Export', href: '/docs/cyclonedx-export', description: 'CycloneDX 1.5 JSON SBOM export', keywords: ['cyclonedx','sbom','export','json','1.5'] },
  { title: 'SPDX 2.3', section: 'SBOM Export', href: '/docs/spdx-export', description: 'SPDX 2.3 SBOM export', keywords: ['spdx','sbom','export','2.3'] },
  { title: 'GitHub Actions CI/CD', section: 'Integrations', href: '/docs/github-actions', description: 'Automate scanning in CI/CD pipelines', keywords: ['github actions','ci','cd','cicd','workflow','yaml'] },
  { title: 'Webhook Auto-Scan', section: 'Integrations', href: '/docs/webhook-auto-scan', description: 'Automatic scanning on git push', keywords: ['webhook','auto','scan','push','trigger'] },
  { title: 'Authentication', section: 'API Reference', href: '/docs/api-authentication', description: 'JWT and API key authentication', keywords: ['auth','api key','jwt','bearer','token'] },
  { title: 'Scan Endpoints', section: 'API Reference', href: '/docs/api-scans', description: 'Create and retrieve scan results', keywords: ['api','scan','endpoint','post','get'] },
  { title: 'CLI Installation & Usage', section: 'CLI Scanner', href: '/docs/cli-scanner', description: 'Install and use the Deptic CLI scanner', keywords: ['cli','install','npm','terminal','command'] },
  { title: 'Workspaces Overview', section: 'Workspaces', href: '/docs/workspaces', description: 'Shared collaboration environments', keywords: ['workspace','team','collaborate','shared'] }
]

export function SearchPalette({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const filtered = query.length === 0 ? DOC_PAGES.slice(0, 8) : DOC_PAGES.filter(page => {
    const q = query.toLowerCase()
    return page.title.toLowerCase().includes(q) ||
           page.description.toLowerCase().includes(q) ||
           page.section.toLowerCase().includes(q) ||
           page.keywords.some(k => k.includes(q))
  })

  const grouped = filtered.reduce<Record<string, DocPage[]>>((acc, page) => {
    if (!acc[page.section]) acc[page.section] = []
    acc[page.section].push(page)
    return acc
  }, {})

  const flatResults = filtered

  const navigate = useCallback((href: string) => {
    onClose()
    setQuery('')
    setSelectedIndex(0)
    router.push(href)
  }, [onClose, router])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter') { e.preventDefault(); if (flatResults[selectedIndex]) navigate(flatResults[selectedIndex].href); return }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, flatResults, navigate, onClose])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-[640px] rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[#1a1a1a] px-4">
          <Search size={18} className="text-[#666666] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="h-14 flex-1 bg-transparent text-base text-white placeholder:text-[#666666] focus:outline-none font-sans"
          />
          <kbd className="hidden sm:flex items-center rounded bg-[#111111] border border-[#1a1a1a] px-1.5 py-0.5 text-[10px] text-[#666666] font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
          {flatResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#666666]">
              <Search size={32} className="mb-3 opacity-30" />
              <p className="text-sm">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            Object.entries(grouped).map(([section, pages]) => (
              <div key={section} className="mb-1">
                <p className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-widest text-[#555555] font-semibold">{section}</p>
                {pages.map((page) => {
                  flatIndex++
                  const idx = flatIndex
                  return (
                    <button
                      key={page.href}
                      data-index={idx}
                      onClick={() => navigate(page.href)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        selectedIndex === idx ? 'bg-[#111111]' : 'hover:bg-[#111111]/50'
                      }`}
                    >
                      <FileText size={16} className={selectedIndex === idx ? 'text-white' : 'text-[#555555]'} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${selectedIndex === idx ? 'text-white' : 'text-[#888888]'}`}>{page.title}</p>
                        <p className="text-xs text-[#555555] truncate">{page.description}</p>
                      </div>
                      {selectedIndex === idx && (
                        <div className="flex items-center gap-1 shrink-0">
                          <CornerDownLeft size={12} className="text-[#666666]" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-[#1a1a1a] px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-[#555555] font-mono">
            <kbd className="rounded bg-[#111111] border border-[#1a1a1a] px-1 py-0.5">↑↓</kbd>
            <span>navigate</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#555555] font-mono">
            <kbd className="rounded bg-[#111111] border border-[#1a1a1a] px-1 py-0.5">↵</kbd>
            <span>open</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#555555] font-mono">
            <kbd className="rounded bg-[#111111] border border-[#1a1a1a] px-1 py-0.5">esc</kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
