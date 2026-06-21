"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { User as UserIcon, Bell, ShieldCheck, Key, Users, Zap, Webhook } from 'lucide-react'
import { cn } from '@/lib/utils'

import { ToastContainer, useToastEmitter } from './_components/shared'
import { ProfileSection } from './_components/profile-section'
import { NotificationsSection } from './_components/notifications-section'
import { SecuritySection } from './_components/security-section'
import { ApiAccessSection } from './_components/api-section'
import { IntegrationsSection } from './_components/integrations-section'
import { WebhooksSection } from './_components/webhook-section'
import { WorkspaceSettingsSection } from './_components/workspace-section'
import { PlanSection } from './_components/plan-section'
import { useWorkspace } from '@/lib/contexts/workspace-context'

type SectionId = 'profile' | 'plan' | 'notifications' | 'security' | 'api' | 'integrations' | 'webhooks'

const TABS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',         icon: UserIcon   },
  { id: 'plan',          label: 'Plan & Usage',    icon: Zap        },
  { id: 'notifications', label: 'Notifications',   icon: Bell       },
  { id: 'security',      label: 'Security & Auth',  icon: ShieldCheck },
  { id: 'api',           label: 'API Access',       icon: Key        },
  { id: 'integrations',  label: 'Integrations',     icon: Zap        },
  { id: 'webhooks',      label: 'Webhooks',         icon: Webhook    },
]

const SECTION_TITLES: Record<SectionId, { title: string; desc: string }> = {
  profile:       { title: 'Profile',         desc: 'Manage your personal information and appearance.' },
  plan:          { title: 'Plan & Usage',    desc: 'View your current plan, limits, and usage.' },
  notifications: { title: 'Notifications',   desc: 'Control which alerts land in your inbox.' },
  security:      { title: 'Security & Auth', desc: 'Passwords, connected providers, and active sessions.' },
  api:           { title: 'API Access',      desc: 'Generate and manage API keys for programmatic access.' },
  integrations:  { title: 'Integrations',    desc: 'Connect Slack and Jira for automated alerts and ticketing.' },
  webhooks:      { title: 'Webhooks',        desc: 'Manage auto-scan triggers for your GitHub repositories.' },
}

export default function SettingsPage() {
  const { activeWorkspace } = useWorkspace()
  const isPersonal = activeWorkspace ? (activeWorkspace.is_personal === true || activeWorkspace.description === 'Default Personal Workspace') : true

  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive]   = useState<SectionId>('profile')
  const toasts                = useToastEmitter()
  const supabase              = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [supabase])

  useEffect(() => {
    if (!isPersonal && active !== 'integrations') {
      setActive('integrations')
    }
  }, [isPersonal, active])

  const filteredTabs = TABS.filter(tab => {
    if (!isPersonal) {
      return tab.id === 'integrations'
    }
    return true
  })

  const { title, desc } = SECTION_TITLES[active]

  return (
    <>
      {/* ── Toast overlay ─────────────────────────────────────── */}
      <ToastContainer toasts={toasts} />

      <div className="max-w-6xl mx-auto pb-24">

        {/* ── Page header ───────────────────────────────────────── */}
        <div className="mb-8 pb-6 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-xs text-zinc-500 mt-1">Manage your account preferences, security, and subscription.</p>
        </div>

        {/* ── Mobile tab bar ────────────────────────────────────── */}
        <div className="flex lg:hidden overflow-x-auto gap-1 pb-4 mb-6 scrollbar-hide border-b border-border">
          {filteredTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                active === id
                  ? "bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Two-column layout ─────────────────────────────────── */}
        <div className="flex gap-8">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col gap-1 w-[240px] shrink-0 sticky top-6 self-start">
            <nav className="space-y-0.5">
              {filteredTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={cn(
                    "group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                    active === id
                      ? "bg-[var(--green)]/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-colors ml-1",
                    active === id ? "text-[var(--green)]" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>


          </aside>

          {/* ── Content area ────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* Section header */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
            </div>

            {/* Section content */}
            {active === 'profile'       && <ProfileSection       user={user} loading={loading} />}
            {active === 'plan'          && <PlanSection />}
            {active === 'notifications' && <NotificationsSection user={user} loading={loading} />}
            {active === 'security'      && <SecuritySection      user={user} loading={loading} />}
            {active === 'api'           && <ApiAccessSection     user={user} loading={loading} />}
            {active === 'integrations'  && <IntegrationsSection  user={user} loading={loading} />}
            {active === 'webhooks'      && <WebhooksSection />}
          </main>
        </div>
      </div>
    </>
  )
}