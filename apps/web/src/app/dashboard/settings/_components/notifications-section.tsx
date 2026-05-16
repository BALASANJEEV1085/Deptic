"use client"

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Bell, Mail } from 'lucide-react'
import { Toggle, SectionSkeleton, showToast } from './shared'

interface Prefs {
  notify_critical: boolean
  notify_high: boolean
  notify_scan_complete: boolean
  notify_weekly_digest: boolean
  notify_new_vuln: boolean
}

const DEFAULTS: Prefs = {
  notify_critical: true,
  notify_high: false,
  notify_scan_complete: true,
  notify_weekly_digest: false,
  notify_new_vuln: true,
}

const ITEMS = [
  { key: 'notify_critical' as keyof Prefs, label: 'Critical CVE Alerts', desc: 'Immediate email for CRITICAL severity vulnerabilities discovered in your projects.' },
  { key: 'notify_high' as keyof Prefs, label: 'High CVE Alerts', desc: 'Email notifications for HIGH severity vulnerabilities.' },
  { key: 'notify_scan_complete' as keyof Prefs, label: 'Scan Completion', desc: 'Notify when a scan finishes processing.' },
  { key: 'notify_weekly_digest' as keyof Prefs, label: 'Weekly Compliance Digest', desc: 'Weekly summary of your SBOM compliance posture.' },
  { key: 'notify_new_vuln' as keyof Prefs, label: 'New Vulnerability in Existing Scans', desc: 'Alert when a new CVE affects a component in a past scan.' },
]

export function NotificationsSection({ user, loading }: { user: User | null; loading: boolean }) {
  const supabase = createClient()
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS)
  const [prefsLoading, setPrefsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (data) setPrefs({
          notify_critical: data.notify_critical,
          notify_high: data.notify_high,
          notify_scan_complete: data.notify_scan_complete,
          notify_weekly_digest: data.notify_weekly_digest,
          notify_new_vuln: data.notify_new_vuln,
        })
      } finally {
        setPrefsLoading(false)
      }
    }
    load()
  }, [user, supabase])

  const handleToggle = async (key: keyof Prefs, value: boolean) => {
    if (!user) return
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    const { error } = await supabase.from('user_preferences').upsert({
      user_id: user.id,
      ...next,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) {
      console.error('Preference update error:', error)
      showToast(`Error: ${error.message || 'Failed to save preference'}`, 'error')
      setPrefs(prefs)
    }
  }

  if (loading || prefsLoading) return <SectionSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5">
        <Mail className="h-4 w-4 text-[#22c55e] shrink-0" />
        <p className="text-xs text-zinc-400">Notifications are delivered to <span className="text-foreground font-semibold">{user?.email}</span></p>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border">
        {ITEMS.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <Bell className="h-4 w-4 text-zinc-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
            <Toggle checked={prefs[key]} onChange={v => handleToggle(key, v)} />
          </div>
        ))}
      </div>

    </div>
  )
}
