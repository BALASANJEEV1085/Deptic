"use client";

import * as React from "react";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folder, ShieldAlert, CheckCircle, ScanSearch, Plus, ArrowRight, ExternalLink, Activity, Target, ShieldCheck } from 'lucide-react';
import { getDashboardStats, listScans, DashboardStats, Scan } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      listScans()
    ]).then(([statsRes, scansRes]) => {
      setStats(statsRes);
      setRecentScans(scansRes.scans.slice(0, 5));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const statCards = [
    { title: 'Total Projects', value: stats?.totalProjects || 0, icon: Folder, color: 'text-zinc-400' },
    { title: 'Analyzed Assets', value: stats?.totalScans || 0, icon: Activity, color: 'text-indigo-400' },
    { title: 'Critical Vulnerabilities', value: stats?.criticalCves || 0, icon: ShieldAlert, color: 'text-red-400' },
    { title: 'Compliant Systems', value: stats?.cleanProjects || 0, icon: ShieldCheck, color: 'text-emerald-400' },
  ];

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 space-y-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/[0.04] pb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Workspace Overview</h1>
          <p className="text-sm text-zinc-500">Supply chain security metrics and recent audit history.</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="bg-white text-black hover:bg-zinc-200 h-10 px-6 rounded-lg font-bold shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95 transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Initiate Scan
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="group relative rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 transition-all hover:bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                  <Icon className={cn("h-3.5 w-3.5", stat.color)} />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.title}</span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {loading ? (
                  <div className="h-8 w-12 animate-pulse bg-white/5 rounded-md" />
                ) : stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Target className="h-4 w-4 text-zinc-600" />
            Recent Security Audits
          </h2>
          {recentScans.length > 0 && (
            <Link href="/dashboard/scans" className="text-xs font-medium text-zinc-500 hover:text-white flex items-center transition-colors">
              View Audit Log <ArrowRight className="ml-1.5 h-3 w-3" />
            </Link>
          )}
        </div>
        
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center rounded-2xl border border-white/[0.04] bg-white/[0.01] animate-pulse">
            <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Fetching Audit Data...</span>
          </div>
        ) : recentScans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.005]">
            <div className="h-14 w-14 rounded-2xl bg-white/[0.02] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
              <ScanSearch className="h-6 w-6 text-zinc-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No audits executed</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-10 leading-relaxed">
              Integrate your first repository to begin automated SBOM generation and vulnerability mapping.
            </p>
            <Link href="/dashboard/projects/new">
              <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl px-8 h-11 text-xs font-bold uppercase tracking-widest">
                Start Integration
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.04] bg-card overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.01] border-b border-white/[0.04]">
                    <th className="px-6 py-4 font-bold text-zinc-500 text-[10px] uppercase tracking-widest">Audit ID</th>
                    <th className="px-6 py-4 font-bold text-zinc-500 text-[10px] uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 font-bold text-zinc-500 text-[10px] uppercase tracking-widest">Timestamp</th>
                    <th className="px-6 py-4 font-bold text-zinc-500 text-[10px] uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {recentScans.map((scan) => (
                    <tr key={scan.id} className="group hover:bg-white/[0.005] transition-colors">
                      <td className="px-6 py-5 font-mono text-[11px] text-zinc-400">
                        {scan.id}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            scan.status === 'done' ? "bg-emerald-500" : 
                            scan.status === 'failed' ? "bg-red-500" : "bg-zinc-600 animate-pulse"
                          )} />
                          <span className={cn(
                            "text-[11px] font-bold uppercase tracking-widest",
                            scan.status === 'done' ? "text-emerald-400" : 
                            scan.status === 'failed' ? "text-red-400" : "text-zinc-500"
                          )}>
                            {scan.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs text-zinc-500">
                        {new Date(scan.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link href={`/dashboard/scans/${scan.id}`}>
                          <button className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10">
                            Inspect Audit <ExternalLink className="h-3 w-3" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
