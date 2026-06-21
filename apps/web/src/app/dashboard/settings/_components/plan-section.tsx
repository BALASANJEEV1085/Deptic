'use client'

import { useEffect, useState } from 'react'
import { Crown, BarChart3, ArrowUpRight } from 'lucide-react'
import { getPaymentStatus, UsageStatus } from '@/lib/api'
import Link from 'next/link'

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const isWarning = pct >= 80
  const isDanger = pct >= 100

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-zinc-300 font-medium">{label}</span>
        <span className={`text-xs font-mono ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-zinc-500'}`}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function PlanSection() {
  const [status, setStatus] = useState<UsageStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getPaymentStatus()
      .then(setStatus)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-zinc-900/50 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        Failed to load plan info: {error}
      </div>
    )
  }

  if (!status) return null

  const isEnterprise = status.plan === 'enterprise'
  const u = status.usage

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className={`rounded-xl p-6 border ${
        isEnterprise
          ? 'bg-gradient-to-br from-zinc-900 to-zinc-800 border-emerald-500/30'
          : 'bg-zinc-900/50 border-zinc-800'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEnterprise ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}>
              <Crown className={`h-5 w-5 ${isEnterprise ? 'text-emerald-400' : 'text-zinc-500'}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100 capitalize">{status.plan} Plan</h3>
              {status.expires_at && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  Renews {new Date(status.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {!isEnterprise && (
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              Upgrade <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {!isEnterprise && (
          <p className="text-xs text-zinc-500">
            Upgrade to Enterprise for 25 daily scans, PDF reports, Slack/Jira integrations, and more.
          </p>
        )}
      </div>

      {/* Usage Section */}
      <div className="rounded-xl p-6 bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Today&apos;s Usage</h3>
        </div>

        <UsageBar label="Scans" used={u.scans_today} limit={u.scans_limit} />
        <UsageBar label="API Keys Created" used={u.api_keys_today} limit={u.api_keys_limit} />
        <UsageBar label="Active Webhooks" used={u.webhooks_active} limit={u.webhooks_limit} />
        <UsageBar label="Workspaces" used={u.workspaces_joined} limit={u.workspaces_limit} />

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Webhook scan gap</span>
            <span className="text-zinc-400 font-mono">{u.webhook_gap_mins} min</span>
          </div>
        </div>
      </div>
    </div>
  )
}
