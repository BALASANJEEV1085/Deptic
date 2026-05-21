"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { User as UserIcon, Bell, ShieldCheck, Key, CreditCard, Zap, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

import { ToastContainer, useToastEmitter } from './_components/shared'
import { ProfileSection } from './_components/profile-section'
import { NotificationsSection } from './_components/notifications-section'
import { SecuritySection } from './_components/security-section'
import { ApiAccessSection } from './_components/api-section'
import { IntegrationsSection } from './_components/integrations-section'
import { BillingSection } from './_components/billing-section'
import { WorkspaceSettingsSection } from './_components/workspace-section'

type SectionId = 'profile' | 'workspace' | 'notifications' | 'security' | 'api' | 'integrations' | 'billing'

const TABS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',         icon: UserIcon   },
  { id: 'workspace',     label: 'Workspace',       icon: Users      },
  { id: 'notifications', label: 'Notifications',   icon: Bell       },
  { id: 'security',      label: 'Security & Auth',  icon: ShieldCheck },
  { id: 'api',           label: 'API Access',       icon: Key        },
  { id: 'integrations',  label: 'Integrations',     icon: Zap        },
  { id: 'billing',       label: 'Billing & Plan',   icon: CreditCard },
]

const SECTION_TITLES: Record<SectionId, { title: string; desc: string }> = {
  profile:       { title: 'Profile',         desc: 'Manage your personal information and appearance.' },
  workspace:     { title: 'Workspace Settings', desc: 'Collaborators, team permissions, and workspace configuration.' },
  notifications: { title: 'Notifications',   desc: 'Control which alerts land in your inbox.' },
  security:      { title: 'Security & Auth', desc: 'Passwords, connected providers, and active sessions.' },
  api:           { title: 'API Access',      desc: 'Generate and manage API keys for programmatic access.' },
  integrations:  { title: 'Integrations',    desc: 'Connect Slack and Jira for automated alerts and ticketing.' },
  billing:       { title: 'Billing & Plan',  desc: 'Your current subscription, usage, and plan options.' },
}

export default function SettingsPage() {
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
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                active === id
                  ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20"
                  : "text-zinc-500 hover:text-foreground hover:bg-muted/40 border border-transparent"
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
          <aside className="hidden lg:flex flex-col gap-1 w-[240px] shrink-0">
            <nav className="space-y-0.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={cn(
                    "group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                    active === id
                      ? "bg-[#22c55e]/[0.08] text-foreground"
                      : "text-zinc-500 hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {/* Green left border for active */}
                  {active === id && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  )}
                  <Icon className={cn(
                    "h-4 w-4 transition-colors ml-1",
                    active === id ? "text-[#22c55e]" : "text-zinc-600 group-hover:text-zinc-400"
                  )} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            {/* Upgrade card */}
            <div className="mt-6 p-4 rounded-xl border border-[#22c55e]/10 bg-gradient-to-br from-[#22c55e]/10 to-[#22c55e]/5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-3.5 w-3.5 text-[#22c55e]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#22c55e]">Upgrade</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                Unlock unlimited scans, API access, and enterprise compliance reporting.
              </p>
              <Button
                onClick={() => setActive('billing')}
                className="w-full h-8 bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold text-[11px]"
              >
                View Plans
              </Button>
            </div>
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
            {active === 'workspace'     && <WorkspaceSettingsSection />}
            {active === 'notifications' && <NotificationsSection user={user} loading={loading} />}
            {active === 'security'      && <SecuritySection      user={user} loading={loading} />}
            {active === 'api'           && <ApiAccessSection     user={user} loading={loading} />}
            {active === 'integrations'  && <IntegrationsSection  user={user} loading={loading} />}
            {active === 'billing'       && <BillingSection       user={user} loading={loading} />}
          </main>
        </div>
      </div>
    </>
  )
}