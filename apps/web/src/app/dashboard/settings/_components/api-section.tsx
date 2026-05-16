"use client"

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Key, Plus, Copy, Trash2, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal, SectionSkeleton, showToast } from './shared'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  key_suffix: string
  created_at: string
  last_used_at?: string
}

async function getHeaders(supabase: ReturnType<typeof createClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
}

export function ApiAccessSection({ user, loading }: { user: User | null; loading: boolean }) {
  const supabase = createClient()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [generateModal, setGenerateModal] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchKeys = async () => {
    try {
      const headers = await getHeaders(supabase)
      const res = await fetch(`${API_URL}/keys`, { headers })
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      }
    } catch { /* no keys endpoint yet — show empty state */ }
    finally { setKeysLoading(false) }
  }

  useEffect(() => { if (user) fetchKeys() }, [user])

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
      setNewKey(data.key || data.api_key || '')
      setKeyName('')
      await fetchKeys()
    } catch {
      showToast('Failed to generate key', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    setRevoking(id)
    setRemovingId(id)
    try {
      const headers = await getHeaders(supabase)
      const res = await fetch(`${API_URL}/keys/${id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Failed')
      setTimeout(() => {
        setKeys(k => k.filter(x => x.id !== id))
        setRemovingId(null)
        showToast('Key revoked')
      }, 400)
    } catch {
      showToast('Failed to revoke key', 'error')
      setRemovingId(null)
    } finally {
      setRevoking(null)
    }
  }

  const copyToClipboard = (text: string, label = 'Copied!') => {
    navigator.clipboard.writeText(text).then(() => showToast(label))
  }

  const ghActionsSnippet = `- uses: sbom-io/sbom-action@v1\n  with:\n    api_key: \${{ secrets.SBOMIO_API_KEY }}`

  if (loading || keysLoading) return <SectionSkeleton />

  return (
    <div className="space-y-6">
      {/* Header + Generate button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">API Keys</p>
          <p className="text-xs text-zinc-500 mt-0.5">Use API keys to authenticate requests to SBOM.io programmatically.</p>
        </div>
        <Button
          onClick={() => { setNewKey(null); setGenerateModal(true) }}
          className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold h-9 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Generate New Key
        </Button>
      </div>

      {/* Keys Table */}
      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <Key className="h-8 w-8 text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-500">No API keys yet</p>
            <p className="text-xs text-zinc-600">Generate your first key to start using the SBOM.io API.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {['Name', 'Key', 'Created', 'Last Used', ''].map(h => (
                  <th key={h} className="px-4 py-3 font-bold text-zinc-500 text-[10px] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map(k => (
                <tr
                  key={k.id}
                  className={cn(
                    "transition-all duration-400",
                    removingId === k.id ? "opacity-0 scale-95" : "opacity-100"
                  )}
                >
                  <td className="px-4 py-3 font-semibold text-foreground">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {k.key_prefix}••••{k.key_suffix}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(k.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-zinc-500">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(k.id)}
                      disabled={revoking === k.id}
                      className="h-7 w-7 text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* GitHub Actions Snippet */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">GitHub Actions Usage</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => copyToClipboard(ghActionsSnippet, 'Snippet copied!')}
            className="h-7 px-2 text-[10px] text-zinc-500 hover:text-foreground font-bold"
          >
            <Copy className="h-3 w-3 mr-1" /> Copy
          </Button>
        </div>
        <pre className="text-[11px] text-[#22c55e] bg-black/40 rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
          {ghActionsSnippet}
        </pre>
      </div>

      {/* Generate Key Modal */}
      <Modal open={generateModal} onClose={() => { setGenerateModal(false); setNewKey(null) }} title="Generate New API Key">
        <div className="space-y-4">
          {!newKey ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Key Name</label>
                <Input
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  placeholder="e.g. GitHub Actions CI"
                  className="bg-muted/40 border-border h-9 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={() => setGenerateModal(false)} className="border-border text-xs h-9">Cancel</Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !keyName.trim()}
                  className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold text-xs h-9"
                >
                  {generating ? 'Generating…' : 'Generate Key'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-start gap-2">
                <Key className="h-4 w-4 text-[#22c55e] shrink-0 mt-0.5" />
                <p className="text-xs text-[#22c55e] font-semibold">Copy your key now — it will not be shown again.</p>
              </div>
              <div className="flex gap-2">
                <code className="flex-1 bg-black/40 rounded-lg p-3 text-xs font-mono text-[#22c55e] break-all">{newKey}</code>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(newKey, 'Key copied!')}
                  className="border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10 h-auto shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={() => { setGenerateModal(false); setNewKey(null) }}
                className="w-full bg-muted hover:bg-muted/80 text-foreground font-bold text-xs h-9"
              >
                Done — I&apos;ve saved my key
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
