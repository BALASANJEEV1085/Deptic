"use client"

import { useEffect, useState, useCallback } from 'react'
import { Webhook, Trash2, Power, PowerOff, Activity, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, GitBranch } from 'lucide-react'
import { CustomLoader } from '@/components/custom-loader'
import { cn } from '@/lib/utils'
import { WebhookRegistration, WebhookEvent, listWebhooks, listWebhookEvents, deleteWebhook, toggleWebhook } from '@/lib/api'
import Link from 'next/link'

export function WebhooksSection() {
  const [webhooks, setWebhooks] = useState<WebhookRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [events, setEvents] = useState<Record<string, WebhookEvent[]>>({})
  const [loadingEvents, setLoadingEvents] = useState<Record<string, boolean>>({})

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listWebhooks()
      setWebhooks(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  const fetchEvents = async (webhookId: string) => {
    if (events[webhookId] || loadingEvents[webhookId]) return;
    
    setLoadingEvents(prev => ({ ...prev, [webhookId]: true }))
    try {
      const data = await listWebhookEvents(webhookId)
      setEvents(prev => ({ ...prev, [webhookId]: data }))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingEvents(prev => ({ ...prev, [webhookId]: false }))
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      fetchEvents(id)
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleWebhook(id, !current)
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, enabled: !current } : w))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this webhook? This will disable auto-scanning for this repository.')) return;
    try {
      await deleteWebhook(id)
      setWebhooks(prev => prev.filter(w => w.id !== id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <CustomLoader size={24} className="text-[#ffffff]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/20 border border-border rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Webhook className="h-4 w-4 text-purple-400" /> GitHub Webhooks
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-lg">
              Manage automatic scanning triggers for your repositories. Auto-scan runs whenever you push changes to the specified branch.
            </p>
          </div>
        </div>

        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
            {error}
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/10">
            <GitBranch className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-400 mb-1">No Webhooks Active</p>
            <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
              Enable Auto-Scan from the Projects tab to automatically trigger DEPTIC scans on new commits.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map(wh => (
              <div key={wh.id} className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-2 w-2 rounded-full", wh.enabled ? "bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)]" : "bg-zinc-600")} />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {wh.repo_owner}/<span className="text-zinc-300">{wh.repo_name}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
                        <span>Branch: {wh.auto_scan_branch}</span>
                        {wh.last_triggered_at && (
                          <span>• Last run: {new Date(wh.last_triggered_at).toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(wh.id, wh.enabled)}
                      className="p-1.5 rounded-md hover:bg-muted text-zinc-400 transition-colors"
                      title={wh.enabled ? "Disable" : "Enable"}
                    >
                      {wh.enabled ? <Power className="h-3.5 w-3.5 text-zinc-400" /> : <PowerOff className="h-3.5 w-3.5 text-red-400" />}
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-red-400 transition-colors"
                      title="Delete Webhook"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="h-4 w-[1px] bg-border mx-1" />
                    <button
                      onClick={() => toggleExpand(wh.id)}
                      className="p-1.5 rounded-md hover:bg-muted text-zinc-400 transition-colors flex items-center gap-1"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      {expandedId === wh.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {expandedId === wh.id && (
                  <div className="border-t border-border bg-muted/5 p-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Recent Events
                    </h4>
                    
                    {loadingEvents[wh.id] ? (
                      <div className="py-4 flex justify-center"><CustomLoader size={16} /></div>
                    ) : events[wh.id]?.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-2 italic">No events recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {events[wh.id]?.map(ev => (
                          <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/20 border border-border/50">
                            <div className="flex items-center gap-3">
                              {ev.status === 'completed' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#4ade80]" />
                              ) : ev.status.startsWith('failed') ? (
                                <XCircle className="h-3.5 w-3.5 text-red-400" />
                              ) : (
                                <CustomLoader size={14} className="text-blue-400" />
                              )}
                              <div>
                                <p className="text-[11px] font-medium text-zinc-300">
                                  <span className="font-mono text-zinc-500">{ev.commit_sha.substring(0, 7)}</span> by {ev.pusher}
                                </p>
                                <p className="text-[9px] text-zinc-500 mt-0.5">
                                  {new Date(ev.received_at).toLocaleString()} • {ev.status}
                                </p>
                              </div>
                            </div>
                            {ev.scan_id && (
                              <Link 
                                href={`/dashboard/scans/${ev.scan_id}`}
                                className="text-[10px] font-bold text-[#ffffff] hover:text-[#ffffff]/80 uppercase tracking-widest"
                              >
                                View Scan →
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
