"use client"

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { Bell, ShieldAlert, MonitorSmartphone, PowerOff, Zap, Users, ShieldCheck, CheckCircle, Activity, Key, LogIn, Lock } from 'lucide-react'
import { Toggle, SectionSkeleton, showToast } from './shared'
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { API_URL, getAuthHeaders } from '@/lib/api'

interface Device {
  device_name: string
  created_at: string
}

interface PushStatus {
  subscribed: boolean
  device_count: number
  devices: Device[]
}

interface Prefs {
  on_scan_complete: boolean
  on_scan_failed: boolean
  on_critical_cve: boolean
  on_high_cve: boolean
  on_medium_cve: boolean
  on_fix_pr_created: boolean
  on_fix_pr_merged: boolean
  on_webhook_triggered: boolean
  on_member_joined: boolean
  on_badge_viewed: boolean
  on_compliance_changed: boolean
  on_new_login: boolean
}

type Group = {
  name: string
  icon: React.ElementType
  items: { key: keyof Prefs; label: string; desc?: string; locked?: boolean }[]
}

const GROUPS: Group[] = [
  {
    name: 'Scans',
    icon: Activity,
    items: [
      { key: 'on_scan_complete', label: 'Scan completed', desc: 'When an audit finishes successfully' },
      { key: 'on_scan_failed', label: 'Scan failed', desc: 'If an error occurs during scanning' },
      { key: 'on_webhook_triggered', label: 'Webhook auto-scan triggered', desc: 'When GitHub triggers a background scan' },
    ]
  },
  {
    name: 'Security',
    icon: ShieldAlert,
    items: [
      { key: 'on_critical_cve', label: 'Critical CVE detected', locked: true, desc: 'Immediate notification (always on)' },
      { key: 'on_high_cve', label: 'High CVE detected', desc: 'Alert for high severity threats' },
      { key: 'on_medium_cve', label: 'Medium CVE detected' },
    ]
  },
  {
    name: 'Actions',
    icon: Zap,
    items: [
      { key: 'on_fix_pr_created', label: 'Fix PR created', desc: 'When DEPTIC opens a PR on GitHub' },
      { key: 'on_fix_pr_merged', label: 'Fix PR merged', desc: 'When an auto-fix is merged' },
    ]
  },
  {
    name: 'Compliance',
    icon: ShieldCheck,
    items: [
      { key: 'on_compliance_changed', label: 'Compliance score changes significantly', desc: 'If NTIA score drops or raises by >10' },
    ]
  },
  {
    name: 'Workspace',
    icon: Users,
    items: [
      { key: 'on_member_joined', label: 'Member joined workspace', desc: 'When a new collaborator accepts invite' },
    ]
  },
  {
    name: 'Account',
    icon: Key,
    items: [
      { key: 'on_new_login', label: 'New login detected', desc: 'Security alert for new sessions' },
    ]
  }
]

export function NotificationsSection({ user, loading }: { user: User | null; loading: boolean }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [pushLoading, setPushLoading] = useState(false)
  const [isSubscribedHere, setIsSubscribedHere] = useState(false)

  const fetchPrefs = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/notifications/preferences`, { headers })
      if (res.ok) {
        setPrefs(await res.json())
      }
    } finally {
      setPrefsLoading(false)
    }
  }

  const fetchPushStatus = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/push/status`, { headers })
      if (res.ok) {
        setPushStatus(await res.json())
      }
      setIsSubscribedHere(await isPushSubscribed())
    } catch (e) {
      console.error('Failed to fetch push status')
    }
  }

  useEffect(() => {
    if (!user) return
    fetchPrefs()
    if (isPushSupported()) {
      fetchPushStatus()
    }
  }, [user])

  const handleToggle = async (key: keyof Prefs, value: boolean) => {
    if (!prefs) return
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/notifications/preferences`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(next)
      })
      if (!res.ok) throw new Error('Failed')
      showToast('Saved', 'success')
    } catch (e) {
      showToast('Error saving preferences', 'error')
      setPrefs(prefs)
    }
  }

  const handleEnablePush = async () => {
    setPushLoading(true)
    const sub = await subscribeToPush()
    if (sub) {
      await fetchPushStatus()
      showToast('Browser notifications enabled', 'success')
      new Notification('Notifications enabled', { icon: '/icon-192.png', body: 'You will receive alerts here.' })
    } else {
      showToast('Failed to enable notifications. Check browser permissions.', 'error')
    }
    setPushLoading(false)
  }

  const handleDisablePush = async () => {
    setPushLoading(true)
    const success = await unsubscribeFromPush()
    if (success) {
      await fetchPushStatus()
      showToast('Notifications disabled on this device', 'success')
    }
    setPushLoading(false)
  }

  if (loading || prefsLoading) return <SectionSkeleton />

  return (
    <div className="space-y-8">
      {/* ── Browser Notifications ────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-[#ffffff]" />
          Browser Notifications
        </h3>
        
        <div className="rounded-xl border border-border bg-muted/10 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${pushStatus?.subscribed ? 'bg-[#4ade80]' : 'bg-zinc-600'}`} />
                <span className="text-sm font-medium text-foreground">
                  {pushStatus?.subscribed ? `Enabled on ${pushStatus.device_count} device(s)` : 'Not enabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-500">Receive real-time alerts in your browser even when DEPTIC is closed.</p>
            </div>
            
            {isPushSupported() ? (
              <div>
                {!isSubscribedHere ? (
                  <button onClick={handleEnablePush} disabled={pushLoading} className="px-4 py-2 bg-[#ffffff] text-black text-xs font-semibold rounded-lg">
                    {pushLoading ? 'Enabling...' : 'Enable on this device'}
                  </button>
                ) : (
                  <button onClick={handleDisablePush} disabled={pushLoading} className="px-4 py-2 border border-border text-zinc-400 hover:text-foreground hover:bg-muted text-xs font-medium rounded-lg">
                    {pushLoading ? 'Disabling...' : 'Disable on this device'}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-500">Push notifications not supported in this browser.</p>
            )}
          </div>

          {pushStatus && pushStatus.devices && pushStatus.devices.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Active Devices</p>
              <div className="space-y-2">
                {pushStatus.devices.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--lp-bg)]/20 border border-border/50">
                    <div className="flex items-center gap-3">
                      <MonitorSmartphone className="h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="text-xs font-semibold text-zinc-300">{d.device_name}</p>
                        <p className="text-[10px] text-zinc-600">Subscribed {new Date(d.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Event Preferences ────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Notification Events</h3>
        <div className="space-y-6">
          {GROUPS.map((group) => (
            <div key={group.name} className="rounded-xl border border-border bg-muted/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
                <group.icon className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{group.name}</span>
              </div>
              <div className="divide-y divide-border">
                {group.items.map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                        {item.locked && <Lock className="h-3 w-3 text-zinc-500" />}
                      </div>
                      {item.desc && <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>}
                    </div>
                    {item.locked ? (
                      <div className="w-8 h-4 bg-[#ffffff] rounded-full relative opacity-50 cursor-not-allowed">
                        <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                      </div>
                    ) : (
                      <Toggle checked={prefs?.[item.key] || false} onChange={(v) => handleToggle(item.key, v)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
