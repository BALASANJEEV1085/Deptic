"use client";

import { useEffect, useState } from "react";
import { getDashboardStats, DashboardStats, ecosystemLabel, ecosystemColorClass, relativeTime } from "@/lib/api";
import { Loader2, Package, ShieldAlert, CheckCircle2, Layers, Clock, AlertTriangle, ArrowRight, ShieldCheck, Activity, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Tiny 5-point sparkline SVG
function Sparkline({ color = "#22c55e" }: { color?: string }) {
  return (
    <svg width="48" height="18" viewBox="0 0 48 18" fill="none" className="opacity-60">
      <polyline
        points="0,14 12,10 24,12 36,5 48,8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function EcoBadge({ eco, status }: { eco: string; status?: string }) {
  const label = ecosystemLabel(eco, status);
  const cls = ecosystemColorClass(eco);
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", cls)}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((data) => { setStats(data); setLoading(false); })
      .catch((err) => { console.error("Failed to load stats", err); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-[#22c55e]/20 border-t-[#22c55e] animate-spin" />
        </div>
        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-zinc-500">Failed to load dashboard statistics.</div>
    );
  }

  const totalScans = stats.ntia_compliant_scans + stats.non_compliant_scans;
  const compliancePercentage = totalScans === 0 ? 0 : Math.round((stats.ntia_compliant_scans / totalScans) * 100);
  const isAllCompliant = totalScans > 0 && stats.non_compliant_scans === 0;

  return (
    <div className="max-w-6xl mx-auto py-6 md:py-8 px-0 space-y-8 pb-20">
      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/[0.04] pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Security Overview</h1>
          <p className="text-sm text-zinc-500">Real-time supply chain intelligence and compliance tracking.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
          <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          Live
        </div>
      </div>

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Components */}
        <div className="group relative rounded-xl border border-white/[0.05] bg-white/[0.01] p-5 transition-all hover:border-white/10 hover:bg-white/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Components</span>
            <Layers className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight mb-2">{stats.total_components.toLocaleString()}</div>
          <div className="flex items-center justify-between">
            <Sparkline color="#22c55e" />
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#22c55e]">
              <TrendingUp className="h-3 w-3" /> Active
            </span>
          </div>
        </div>

        {/* Critical CVEs */}
        <div className={cn(
          "group relative rounded-xl border p-5 transition-all",
          stats.critical_cves > 0
            ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
            : "border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02]"
        )}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", stats.critical_cves > 0 ? "text-red-400" : "text-zinc-500")}>
              Critical CVEs
            </span>
            <ShieldAlert className={cn("h-4 w-4", stats.critical_cves > 0 ? "text-red-500" : "text-zinc-600")} />
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight mb-2", stats.critical_cves > 0 ? "text-red-500" : "text-white")}>
            {stats.critical_cves}
          </div>
          <div className="flex items-center justify-between">
            <Sparkline color={stats.critical_cves > 0 ? "#ef4444" : "#52525b"} />
            <span className={cn("text-[10px] font-bold", stats.critical_cves > 0 ? "text-red-400" : "text-zinc-600")}>
              {stats.critical_cves > 0 ? "Needs action" : "All clear"}
            </span>
          </div>
        </div>

        {/* NTIA Compliant */}
        <div className={cn(
          "group relative rounded-xl border p-5 transition-all",
          compliancePercentage === 100
            ? "border-[#22c55e]/20 bg-[#22c55e]/5 hover:bg-[#22c55e]/10"
            : "border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02]"
        )}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", compliancePercentage === 100 ? "text-[#22c55e]" : "text-zinc-500")}>
              NTIA Compliant
            </span>
            <ShieldCheck className={cn("h-4 w-4", compliancePercentage === 100 ? "text-[#22c55e]" : "text-zinc-600")} />
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight mb-2", compliancePercentage === 100 ? "text-[#22c55e]" : "text-white")}>
            {stats.ntia_compliant_scans}<span className="text-xl text-zinc-500">/{totalScans}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden mr-3">
              <div
                className="h-full rounded-full bg-[#22c55e]"
                style={{ width: `${compliancePercentage}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-zinc-500">{compliancePercentage}%</span>
          </div>
        </div>

        {/* Clean Projects */}
        <div className={cn(
          "group relative rounded-xl border p-5 transition-all",
          stats.clean_projects > 0
            ? "border-[#22c55e]/20 bg-[#22c55e]/5 hover:bg-[#22c55e]/10"
            : "border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02]"
        )}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", stats.clean_projects > 0 ? "text-[#22c55e]" : "text-zinc-500")}>
              Clean Projects
            </span>
            <CheckCircle2 className={cn("h-4 w-4", stats.clean_projects > 0 ? "text-[#22c55e]" : "text-zinc-600")} />
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight mb-2", stats.clean_projects > 0 ? "text-[#22c55e]" : "text-white")}>
            {stats.clean_projects}
          </div>
          <div className="flex items-center justify-between">
            <Sparkline color={stats.clean_projects > 0 ? "#22c55e" : "#52525b"} />
            <span className="text-[10px] font-bold text-zinc-600">No criticals</span>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left — Recent Scans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-[#22c55e]" />
              Recent Scans
            </h2>
            <Link href="/dashboard/scans" className="text-[10px] font-bold text-[#22c55e] uppercase tracking-widest hover:text-[#16a34a] flex items-center gap-1 transition-colors">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-card border border-white/[0.05] rounded-xl overflow-hidden divide-y divide-white/[0.04]">
            {(stats.recent_scans?.length ?? 0) === 0 ? (
              <div className="p-10 text-center">
                <Activity className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-600">No recent scans found.</p>
              </div>
            ) : (
              (stats.recent_scans ?? []).map((scan) => (
                <Link key={scan.id} href={`/dashboard/scans/${scan.id}`} className="block p-4 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        scan.status === 'done' ? "bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.5)]" :
                        scan.status === 'failed' ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" :
                        "bg-amber-500 animate-pulse"
                      )} />
                      <span className="font-bold text-zinc-200 text-sm truncate max-w-[180px]">{scan.repo_name}</span>
                    </div>
                    <EcoBadge eco={scan.ecosystem} status={scan.status} />
                  </div>
                  <div className="flex items-center gap-4 text-[11px] pl-4 text-zinc-500 flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {relativeTime(scan.created_at)}</span>
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {scan.component_count} libs</span>
                    {scan.critical_cves > 0 && (
                      <span className="flex items-center gap-1 text-red-400 font-bold">
                        <ShieldAlert className="h-3 w-3" /> {scan.critical_cves} CRIT
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right — Security Overview + Compliance */}
        <div className="space-y-6">

          {/* Security Overview bars */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
                Security Overview
              </h2>
              <Link href="/dashboard/vulnerabilities" className="text-[10px] font-bold text-[#22c55e] uppercase tracking-widest hover:text-[#16a34a] flex items-center gap-1 transition-colors">
                Threat Log <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="bg-card border border-white/[0.05] rounded-xl p-5 space-y-5">
              {(() => {
                const maxVal = Math.max(stats.critical_cves, stats.high_cves, stats.medium_cves, stats.low_cves, 1);
                const bars = [
                  { label: "Critical", value: stats.critical_cves, color: "bg-red-500",    text: "text-red-400",    glow: "shadow-[0_0_8px_rgba(239,68,68,0.4)]" },
                  { label: "High",     value: stats.high_cves,     color: "bg-orange-500",  text: "text-orange-400", glow: "" },
                  { label: "Medium",   value: stats.medium_cves,   color: "bg-amber-500",   text: "text-amber-400",  glow: "" },
                  { label: "Low",      value: stats.low_cves,      color: "bg-zinc-500",    text: "text-zinc-400",   glow: "" },
                ];
                return bars.map((bar) => (
                  <div key={bar.label}>
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-zinc-500 uppercase tracking-widest text-[10px]">{bar.label}</span>
                      <span className={bar.text}>{bar.value}</span>
                    </div>
                    <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.03]">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", bar.color, bar.value > 0 ? bar.glow : "opacity-20")}
                        style={{ width: bar.value === 0 ? "2%" : `${Math.max((bar.value / maxVal) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Compliance Overview */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#22c55e]" />
              Compliance Overview
            </h2>

            {isAllCompliant ? (
              <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 p-5 rounded-xl flex items-center gap-4">
                <div className="h-9 w-9 bg-[#22c55e]/20 rounded-full flex items-center justify-center border border-[#22c55e]/30 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-[#22c55e] font-bold text-sm">All projects compliant ✓</p>
                  <p className="text-[#22c55e]/50 text-xs mt-0.5">NTIA EO14028 Minimum Elements satisfied.</p>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-white/[0.05] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-bold text-sm mb-0.5">NTIA EO14028 Readiness</p>
                    <p className="text-zinc-600 text-xs">Based on {totalScans} analyzed scans</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-white">{compliancePercentage}%</p>
                    <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Overall</p>
                  </div>
                </div>

                <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden mb-4 border border-white/[0.03]">
                  <div
                    className="h-full bg-[#22c55e] rounded-full"
                    style={{ width: `${compliancePercentage}%` }}
                  />
                </div>

                {stats.non_compliant_scans > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">
                        {stats.non_compliant_scans} audit{stats.non_compliant_scans > 1 ? 's' : ''} require attention
                      </p>
                    </div>
                    <div className="space-y-2">
                      {(stats.recent_scans ?? [])
                        .filter((s: { ntia_score: number }) => s.ntia_score < 100)
                        .slice(0, 3)
                        .map((s: { id: string; repo_name: string }) => (
                          <Link
                            key={s.id}
                            href={`/dashboard/scans/${s.id}?tab=compliance`}
                            className="flex items-center justify-between bg-black/20 px-3 py-2 rounded-lg hover:bg-black/30 transition-colors"
                          >
                            <span className="text-xs font-semibold text-zinc-300 truncate">{s.repo_name}</span>
                            <span className="text-[10px] text-amber-400 font-bold ml-2 shrink-0">Review →</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
