"use client"

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  Key, Plus, Copy, Trash2, Terminal, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertTriangle, Check, Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, SectionSkeleton, showToast } from './shared'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deptic-api.onrender.com/api'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  used: boolean
  used_at: string | null
  created_at: string
}

async function getHeaders(supabase: ReturnType<typeof createClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ used, usedAt }: { used: boolean; usedAt: string | null }) {
  if (!used) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Available
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-500/10 text-zinc-500 border border-zinc-700/40">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
      Used {usedAt ? new Date(usedAt).toLocaleDateString() : ''}
    </span>
  )
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copied!' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      showToast(label)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-muted-foreground hover:text-zinc-100 hover:bg-zinc-700/50 transition-all"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ─── Code Snippet with Copy ────────────────────────────────────────────────────
function CodeSnippet({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="relative rounded-lg bg-[var(--lp-bg)]/50 border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{lang}</span>
        <CopyButton text={code} label="Command copied!" />
      </div>
      <pre className="text-[11px] text-emerald-400 p-4 overflow-x-auto font-mono leading-relaxed whitespace-pre">{code}</pre>
    </div>
  )
}

// ─── CLI How-to Section ────────────────────────────────────────────────────────
function CLIHowTo() {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<'windows' | 'mac'>('windows')

  const installSnippet = `npm install -g deptic-scan`

  const windowsSnippet = `# Navigate to your project folder
cd C:\\Users\\you\\projects\\my-app

# Run the scanner
deptic-scan`

  const macSnippet = `# Navigate to your project folder
cd ~/projects/my-app

# Run the scanner
deptic-scan`

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="h-4 w-4 text-zinc-500" />
          <span className="text-xs font-bold text-muted-foreground">How to use the CLI Scanner</span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-zinc-600" />
          : <ChevronDown className="h-4 w-4 text-zinc-600" />
        }
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-border pt-5">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              1. Install the scanner (one time only)
            </p>
            <CodeSnippet code={installSnippet} lang="npm" />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              2. Navigate to your project &amp; run
            </p>
            {/* Platform tabs */}
            <div className="flex gap-1 p-0.5 rounded-lg bg-zinc-900/60 border border-zinc-800 w-fit">
              <button
                onClick={() => setPlatform('windows')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                  platform === 'windows'
                    ? "bg-muted text-foreground shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Windows PowerShell
              </button>
              <button
                onClick={() => setPlatform('mac')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                  platform === 'mac'
                    ? "bg-muted text-foreground shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Mac / Linux
              </button>
            </div>
            <CodeSnippet
              code={platform === 'windows' ? windowsSnippet : macSnippet}
              lang={platform === 'windows' ? 'powershell' : 'bash'}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              3. Enter your API key when prompted
            </p>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              The scanner will ask for your API key, then automatically detect manifest files
              (<code className="text-muted-foreground">package.json</code>,
              {' '}<code className="text-muted-foreground">requirements.txt</code>,
              {' '}<code className="text-muted-foreground">pom.xml</code>,
              {' '}<code className="text-muted-foreground">go.mod</code>, etc.)
              and send them for analysis.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500/70 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-500/70 leading-relaxed">
              Each API key is <strong>single-use</strong> — it works for exactly one scan and is permanently consumed. Generate a new key for each scan.
            </p>
          </div>

          <p className="text-[10px] text-zinc-600">
            The scanner prints results to your terminal and downloads{' '}
            <code className="text-muted-foreground text-[10px]">deptic-report.pdf</code>,{' '}
            <code className="text-muted-foreground text-[10px]">deptic.cyclonedx.json</code>, and{' '}
            <code className="text-muted-foreground text-[10px]">deptic.spdx</code>{' '}
            to your current directory. Download links expire after 1 hour.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ApiAccessSection({ user, loading }: { user: User | null; loading: boolean }) {
  const supabase = createClient()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [generateModal, setGenerateModal] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      const headers = await getHeaders(supabase)
      const res = await fetch(`${API_URL}/keys`, { headers })
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      }
    } catch { /* keys endpoint not yet available */ }
    finally { setKeysLoading(false) }
  }, [supabase])

  useEffect(() => { if (user) fetchKeys() }, [user, fetchKeys])

  const handleGenerate = async () => {
    if (!keyName.trim()) return
    setGenerating(true)
    try {
      const headers = await getHeaders(supabase)
      const res = await fetch(`${API_URL}/keys`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: keyName.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setNewKey(data.key || '')
      setKeyName('')
      await fetchKeys()
    } catch {
      showToast('Failed to generate key', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setRemovingId(id)
    try {
      const headers = await getHeaders(supabase)
      const res = await fetch(`${API_URL}/keys/${id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Failed')
      setTimeout(() => {
        setKeys(k => k.filter(x => x.id !== id))
        setRemovingId(null)
        showToast('Key deleted')
      }, 400)
    } catch {
      showToast('Failed to delete key', 'error')
      setRemovingId(null)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading || keysLoading) return <SectionSkeleton />

  const maskedKey = (prefix: string) => `${prefix}••••••••••••••••••••••••••••••••••`

  return (
    <div className="space-y-6">
      {/* Header + Generate button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">API Keys</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Single-use disposable keys for the CLI scanner. Each key works for one scan only.
          </p>
        </div>
        <Button
          onClick={() => { setNewKey(null); setGenerateModal(true) }}
          className="bg-[#ffffff] hover:bg-[#ffffff]/90 text-black font-bold h-9 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Generate New Key
        </Button>
      </div>

      {/* Keys Table */}
      <div className="ds-table-wrap border border-border bg-muted/20 rounded-xl overflow-x-auto">
        {keys.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-800/60 flex items-center justify-center">
              <Key className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-sm font-semibold text-zinc-500">No API keys yet</p>
            <p className="text-xs text-zinc-600">Generate your first key to start using the CLI scanner.</p>
          </div>
        ) : (
          <table className="ds-table text-xs w-full">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'Key', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-zinc-500 text-[10px] uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map(k => (
                <tr
                  key={k.id}
                  className={cn(
                    "transition-all duration-400 hover:bg-muted/20",
                    removingId === k.id ? "opacity-0 scale-95" : "opacity-100"
                  )}
                >
                  {/* Name */}
                  <td className="px-4 py-3.5 font-semibold text-foreground">{k.name}</td>

                  {/* Key (masked) */}
                  <td className="px-4 py-3.5 font-mono text-zinc-500 text-[11px]">
                    {maskedKey(k.key_prefix)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge used={k.used} usedAt={k.used_at} />
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3.5 text-zinc-500">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>

                  {/* Action — Revoke only on unused keys */}
                  <td className="px-4 py-3.5 text-right">
                    {!k.used && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(k.id)}
                        disabled={deletingId === k.id}
                        className="h-7 w-7 text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
                        title="Revoke key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {k.used && (
                      <span title="Key consumed" className="flex justify-center">
                        <CheckCircle2 className="h-4 w-4 text-zinc-600" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CLI How-to collapsible */}
      <CLIHowTo />

      {/* Generate Key Modal */}
      <Modal
        open={generateModal}
        onClose={() => { setGenerateModal(false); setNewKey(null) }}
        title="Generate New API Key"
      >
        <div className="space-y-4">
          {!newKey ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Key Name
                </label>
                <Input
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  placeholder="e.g. GitHub Actions CI, Release pipeline"
                  className="bg-muted/40 border-border h-9 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  autoFocus
                />
                <p className="text-[10px] text-zinc-600">
                  Give this key a descriptive name so you can identify it later.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500/70 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-500/70 leading-relaxed">
                  This key will be shown <strong>once</strong> and is valid for <strong>one scan only</strong>.
                  Store it securely before closing this dialog.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="outline"
                  onClick={() => setGenerateModal(false)}
                  className="border-border text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !keyName.trim()}
                  className="bg-[#ffffff] hover:bg-[#ffffff]/90 text-black font-bold text-xs h-9"
                >
                  {generating ? 'Generating…' : 'Generate Key'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Warning banner */}
              <div className="p-3 rounded-lg bg-[#ffffff]/10 border border-[#ffffff]/25 flex items-start gap-2">
                <Key className="h-4 w-4 text-[#ffffff] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#ffffff]">Copy your key now</p>
                  <p className="text-[10px] text-[#ffffff]/70 mt-0.5">
                    This key will <strong>not</strong> be shown again. It is valid for one scan only.
                  </p>
                </div>
              </div>

              {/* Key display */}
              <div className="rounded-lg bg-[var(--lp-bg)]/40 border border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60">
                  <span className="text-[10px] text-zinc-600 font-mono">API Key</span>
                  <CopyButton text={newKey} label="Key copied!" />
                </div>
                <code className="block p-4 text-[12px] font-mono text-[#ffffff] break-all leading-relaxed select-all">
                  {newKey}
                </code>
              </div>

              <Button
                onClick={() => { setGenerateModal(false); setNewKey(null) }}
                className="w-full bg-muted hover:bg-muted/80 text-foreground font-bold text-xs h-9"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Done — I&apos;ve saved my key
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
