"use client";

import { useEffect, useState } from "react";
import { getDashboardStats, DashboardStats } from "@/lib/api";
import { Loader2, Package, ShieldAlert, CheckCircle2, CheckSquare, Layers, Clock, AlertTriangle, ArrowRight, ShieldCheck, Activity } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load stats", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Failed to load dashboard statistics.
      </div>
    );
  }

  const totalScans = stats.ntia_compliant_scans + stats.non_compliant_scans;
  const compliancePercentage = totalScans === 0 ? 0 : Math.round((stats.ntia_compliant_scans / totalScans) * 100);
  const isAllCompliant = totalScans > 0 && stats.non_compliant_scans === 0;

  return (
    <div className="max-w-6xl mx-auto py-6 md:py-10 px-4 md:px-6 space-y-8 md:space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/[0.04] pb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Security Overview</h1>
          <p className="text-sm text-zinc-500 font-medium">Real-time supply chain intelligence and compliance tracking.</p>
        </div>
      </div>

      {/* Top stats row (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 transition-all hover:bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Total Components</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{stats.total_components.toLocaleString()}</div>
        </div>

        <div className={cn("group relative rounded-2xl border p-6 transition-all", stats.critical_cves > 0 ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10" : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]")}>
          <div className="flex items-center justify-between mb-4">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", stats.critical_cves > 0 ? "text-red-400" : "text-zinc-500")}>Critical CVEs</span>
            <ShieldAlert className={cn("h-4 w-4", stats.critical_cves > 0 ? "text-red-500" : "text-zinc-600")} />
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", stats.critical_cves > 0 ? "text-red-500" : "text-white")}>{stats.critical_cves}</div>
        </div>

        <div className={cn("group relative rounded-2xl border p-6 transition-all", compliancePercentage === 100 ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]")}>
          <div className="flex items-center justify-between mb-4">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", compliancePercentage === 100 ? "text-emerald-400" : "text-zinc-500")}>NTIA Compliant</span>
            <CheckSquare className={cn("h-4 w-4", compliancePercentage === 100 ? "text-emerald-500" : "text-zinc-600")} />
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", compliancePercentage === 100 ? "text-emerald-500" : "text-white")}>
            {stats.ntia_compliant_scans}<span className="text-xl text-zinc-500">/{totalScans}</span>
          </div>
        </div>

        <div className={cn("group relative rounded-2xl border p-6 transition-all", stats.clean_projects > 0 ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]")}>
          <div className="flex items-center justify-between mb-4">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", stats.clean_projects > 0 ? "text-emerald-400" : "text-zinc-500")}>Clean Projects</span>
            <CheckCircle2 className={cn("h-4 w-4", stats.clean_projects > 0 ? "text-emerald-500" : "text-zinc-600")} />
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", stats.clean_projects > 0 ? "text-emerald-500" : "text-white")}>{stats.clean_projects}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column — Recent Scans */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              Recent Scans
            </h2>
            <Link href="/dashboard/scans" className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          
          <div className="bg-card border border-white/[0.04] rounded-2xl overflow-hidden shadow-2xl divide-y divide-white/[0.04]">
            {stats.recent_scans.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">No recent scans found.</div>
            ) : (
              stats.recent_scans.map((scan) => (
                <Link key={scan.id} href={`/dashboard/scans/${scan.id}`} className="block p-5 hover:bg-white/[0.01] transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]",
                        scan.status === 'done' ? "bg-emerald-500 shadow-emerald-500/50" : 
                        scan.status === 'failed' ? "bg-red-500 shadow-red-500/50" : "bg-amber-500 shadow-amber-500/50"
                      )} />
                      <span className="font-bold text-zinc-200 text-sm">{scan.repo_name}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest text-zinc-500 border-white/10 bg-white/[0.02]">{scan.ecosystem}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs pl-5 text-zinc-500">
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(scan.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> {scan.component_count} libs</span>
                    {scan.critical_cves > 0 && <span className="flex items-center gap-1.5 text-red-400"><ShieldAlert className="h-3.5 w-3.5" /> {scan.critical_cves} crit</span>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right column — Security Overview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              Security Overview
            </h2>
            <Link href="/dashboard/vulnerabilities" className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 flex items-center gap-1">
              View Threat Log <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-card border border-white/[0.04] rounded-2xl p-6 shadow-2xl space-y-6">
             {(() => {
               const maxVal = Math.max(stats.critical_cves, stats.high_cves, stats.medium_cves, stats.low_cves, 1);
               const getWidth = (val: number) => `${Math.max((val / maxVal) * 100, 2)}%`;
               
               const bars = [
                 { label: "Critical", value: stats.critical_cves, color: "bg-red-500", text: "text-red-400" },
                 { label: "High", value: stats.high_cves, color: "bg-orange-500", text: "text-orange-400" },
                 { label: "Medium", value: stats.medium_cves, color: "bg-amber-500", text: "text-amber-400" },
                 { label: "Low", value: stats.low_cves, color: "bg-zinc-400", text: "text-zinc-400" },
               ];

               return bars.map((bar) => (
                 <div key={bar.label} className="space-y-2">
                   <div className="flex items-center justify-between text-xs font-bold">
                     <span className="text-zinc-400 uppercase tracking-widest text-[10px]">{bar.label}</span>
                     <span className={bar.text}>{bar.value}</span>
                   </div>
                   <div className="w-full h-2 bg-white/[0.02] rounded-full overflow-hidden">
                     <div 
                       className={cn("h-full rounded-full", bar.color, bar.value > 0 ? "shadow-[0_0_10px_rgba(255,255,255,0.1)]" : "opacity-30")} 
                       style={{ width: getWidth(bar.value), opacity: bar.value === 0 ? 0 : 1 }} 
                     />
                   </div>
                 </div>
               ));
             })()}
          </div>
        </div>
      </div>

      {/* Bottom — Compliance Overview */}
      <div className="space-y-6">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Compliance Overview
        </h2>

        {isAllCompliant ? (
           <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl flex items-center justify-between shadow-xl">
             <div className="flex items-center gap-4">
               <div className="h-10 w-10 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                 <CheckCircle2 className="h-5 w-5 text-emerald-400" />
               </div>
               <div>
                 <p className="text-emerald-400 font-bold">All projects are compliant ✓</p>
                 <p className="text-emerald-500/60 text-xs mt-1">NTIA EO14028 Minimum Elements satisfied across all active audits.</p>
               </div>
             </div>
             <Link href="/dashboard/reports">
               <Button variant="outline" className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 font-bold bg-transparent">
                 View Reports
               </Button>
             </Link>
           </div>
        ) : (
           <div className="bg-card border border-white/[0.04] rounded-2xl p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-white font-bold text-lg mb-1">NTIA EO14028 Readiness</p>
                  <p className="text-zinc-500 text-xs">Based on {totalScans} total analyzed projects</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-white">{compliancePercentage}%</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Overall Compliance</p>
                </div>
             </div>
             
             <div className="w-full h-3 bg-white/[0.02] rounded-full overflow-hidden mb-8 border border-white/[0.04]">
               <div 
                 className="h-full bg-indigo-500 rounded-full relative" 
                 style={{ width: `${compliancePercentage}%` }} 
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
               </div>
             </div>

             {stats.non_compliant_scans > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                   <div className="flex items-center gap-3 mb-3">
                     <AlertTriangle className="h-4 w-4 text-amber-500" />
                     <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">{stats.non_compliant_scans} audits require attention</p>
                   </div>
                   <div className="space-y-2">
                     {stats.recent_scans.filter(s => s.ntia_score < 100).map(s => (
                       <div key={s.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                         <span className="text-sm font-medium text-zinc-300">{s.repo_name}</span>
                         <Link href={`/dashboard/scans/${s.id}?tab=compliance`} className="text-xs text-amber-400 hover:text-amber-300 font-bold">Review Issues →</Link>
                       </div>
                     ))}
                   </div>
                </div>
             )}
           </div>
        )}
      </div>

    </div>
  );
}
