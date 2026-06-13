"use client"

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Zap, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionSkeleton, showToast } from './shared'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deptic-api.onrender.com/api'
const FREE_SCAN_LIMIT = 5

interface UsageStats { scans_used: number; components_scanned: number }

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    badge: 'FREE',
    description: 'Perfect for individual researchers and open-source projects.',
    features: ['5 scans / month', 'NTIA compliance reports', 'Basic vulnerability scan', 'PDF export', 'Community support'],
    color: 'border-border',
    badgeColor: 'bg-zinc-800 text-foreground border-zinc-700',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    badge: 'PRO',
    description: 'For security teams requiring real-time CVE intelligence.',
    features: ['Unlimited scans', 'Real-time CVE monitoring', 'API access', 'GitHub Actions integration', 'Priority support'],
    color: 'border-[#ffffff]/30',
    badgeColor: 'bg-[#ffffff]/10 text-[#ffffff] border-[#ffffff]/20',
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    badge: 'ENT',
    description: 'Full compliance suite for large security organizations.',
    features: ['Everything in Pro', 'SSO / SAML', 'EU CRA compliance', 'Custom integrations', 'SLA & dedicated support'],
    color: 'border-purple-500/20',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
]

async function getHeaders(supabase: ReturnType<typeof createClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session?.access_token}` }
}

export function BillingSection({ user, loading }: { user: User | null; loading: boolean }) {
  const supabase = createClient()
  const [usage, setUsage] = useState<UsageStats>({ scans_used: 0, components_scanned: 0 })
  const [usageLoading, setUsageLoading] = useState(true)
  const currentPlanId = user?.user_metadata?.plan || 'starter'

  useEffect(() => {
    if (!user) return
    const fetchUsage = async () => {
      try {
        const headers = await getHeaders(supabase)
        const res = await fetch(`${API_URL}/dashboard/stats`, { headers })
        if (res.ok) {
          const data = await res.json()
          // Use current-month scans & components from stats
          const now = new Date()
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          // Try to get current-month count; fall back to total_scans
          setUsage({
            scans_used: data.monthly_scans ?? Math.min(data.total_scans ?? 0, FREE_SCAN_LIMIT),
            components_scanned: data.monthly_components ?? data.total_components ?? 0,
          })
        }
      } catch { /* ignore */ }
      finally { setUsageLoading(false) }
    }
    fetchUsage()
  }, [user, supabase])

  const handleUpgrade = () => {
    showToast('Stripe integration coming soon! Email us at hello@deptic.io', 'error')
  }

  const scanPct = Math.min((usage.scans_used / FREE_SCAN_LIMIT) * 100, 100)
  const isOverLimit = usage.scans_used > FREE_SCAN_LIMIT * 0.8

  if (loading || usageLoading) return <SectionSkeleton />

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className={cn("rounded-xl border p-6 space-y-4", currentPlanId === 'pro' ? "border-[#ffffff]/30 bg-[#ffffff]/5" : "border-border bg-muted/20")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-foreground">Current Plan</p>
              <Badge className={cn("text-[10px] font-bold border", currentPlanId === 'pro' ? "bg-[#ffffff]/10 text-[#ffffff] border-[#ffffff]/20" : "bg-zinc-800 text-foreground border-zinc-700")}>
                {currentPlanId.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              {currentPlanId === 'pro' ? 'Next billing date: automatically renews monthly.' : 'Free plan — upgrade for unlimited access.'}
            </p>
          </div>
          {currentPlanId !== 'pro' && (
            <Button onClick={handleUpgrade} className="bg-[#ffffff] hover:bg-[#ffffff]/90 text-black font-bold text-xs h-9 shrink-0">
              <Zap className="h-3.5 w-3.5 mr-1.5" /> Upgrade to Pro
            </Button>
          )}
        </div>

        {/* Usage Stats */}
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">This Month&apos;s Usage</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Scans used</span>
                <span className={cn("font-bold", isOverLimit ? "text-red-400" : "text-foreground")}>
                  {usage.scans_used} / {currentPlanId === 'starter' ? FREE_SCAN_LIMIT : '∞'}
                </span>
              </div>
              {currentPlanId === 'starter' && (
                <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", isOverLimit ? "bg-red-500" : "bg-[#ffffff]")}
                    style={{ width: `${scanPct}%` }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Components scanned</span>
                <span className="font-bold text-foreground">{usage.components_scanned.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: '100%', opacity: 0.4 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Compare Plans</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlanId
            return (
              <div key={plan.id} className={cn("rounded-xl border p-5 space-y-4 relative transition-all", plan.color, isCurrent ? "ring-1 ring-[#ffffff]/30" : "", plan.recommended ? "bg-[#ffffff]/[0.03]" : "bg-muted/20")}>
                {plan.recommended && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[#ffffff] text-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Popular</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{plan.name}</span>
                    <Badge className={cn("text-[9px] font-bold border", plan.badgeColor)}>{plan.badge}</Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-foreground">{plan.price}</span>
                    {plan.price !== 'Custom' && <span className="text-xs text-zinc-500">/mo</span>}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{plan.description}</p>
                </div>
                <div className="space-y-2">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-[#ffffff] shrink-0 mt-0.5" />
                      <span className="text-[11px] text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={isCurrent ? undefined : handleUpgrade}
                  disabled={isCurrent}
                  className={cn(
                    "w-full h-8 text-[11px] font-bold transition-all",
                    isCurrent
                      ? "bg-muted border border-border text-zinc-600 cursor-default"
                      : plan.id === 'enterprise'
                      ? "bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20"
                      : "bg-[#ffffff] hover:bg-[#ffffff]/90 text-black"
                  )}
                >
                  {isCurrent ? 'Current Plan' : plan.id === 'enterprise' ? (
                    <><ArrowUpRight className="h-3 w-3 mr-1" /> Contact Sales</>
                  ) : 'Upgrade'}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
