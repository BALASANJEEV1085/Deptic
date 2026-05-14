"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Loader2, ScanSearch, Copy, Check, ChevronDown } from 'lucide-react';
import { listScans, Scan, ecosystemLabel, ecosystemColorClass, relativeTime, shortId, ntiaScoreColor } from '@/lib/api';
import { cn, getComplianceStatus } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadPDFReport } from '@/lib/api';

function EcoBadge({ eco, status }: { eco: string; status?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
      ecosystemColorClass(eco)
    )}>
      {ecosystemLabel(eco, status)}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'done') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
      <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />Done
    </span>
  );
  if (status === 'failed') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Failed
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />Running
    </span>
  );
}

function VulnBadges({ crit, high, med, low }: { crit: number; high: number; med: number; low: number }) {
  const total = crit + high + med + low;
  if (total === 0) return <span className="text-[10px] text-zinc-600">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {crit > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">{crit} CRIT</span>}
      {high > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">{high} HIGH</span>}
      {med  > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">{med} MED</span>}
      {low  > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-400">{low} LOW</span>}
    </div>
  );
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <span className="group/copy flex items-center gap-1">
      <span className="font-mono text-[10px] text-zinc-600">{shortId(id)}</span>
      <button onClick={copy} className="opacity-0 group-hover/copy:opacity-100 transition-opacity ml-0.5">
        {copied
          ? <Check className="h-3 w-3 text-[#22c55e]" />
          : <Copy className="h-3 w-3 text-zinc-600 hover:text-zinc-400" />}
      </button>
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      {[1,2,3,4,5,6,7,8].map(i => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 bg-white/[0.04] rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ecoFilter, setEcoFilter] = useState('All');

  useEffect(() => {
    listScans()
      .then(res => { setScans(res.scans || []); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return scans.filter(s => {
      const name = (s.repo_name || s.id).toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
      if (statusFilter !== 'All' && s.status !== statusFilter.toLowerCase()) return false;
      if (ecoFilter !== 'All' && (s.ecosystem || 'unknown').toLowerCase() !== ecoFilter.toLowerCase()) return false;
      return true;
    });
  }, [scans, search, statusFilter, ecoFilter]);

  const ecosystems = ['All', ...Array.from(new Set(scans.map(s => s.ecosystem || 'unknown')))];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">Scan History</h1>
          <p className="text-[11px] text-zinc-500">All SBOM scans across your repositories.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Search by repository..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white/[0.02] border border-white/[0.08] rounded-lg text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#22c55e]/40 transition-colors"
          />
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/[0.08] rounded-lg text-[10px] font-bold text-zinc-400 hover:bg-white/[0.04] transition-colors focus:outline-none min-w-[120px] justify-between">
            {statusFilter === 'All' ? 'All Statuses' : statusFilter}
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#0d0e10] border-white/10 text-zinc-300 p-1 min-w-[120px]">
            {['All', 'done', 'failed', 'running'].map(s => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className={cn("text-[11px] cursor-pointer focus:bg-white/5 rounded capitalize", statusFilter === s && "text-[#22c55e]")}>
                {s === 'All' ? 'All Statuses' : s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ecosystem filter */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/[0.08] rounded-lg text-[10px] font-bold text-zinc-400 hover:bg-white/[0.04] transition-colors focus:outline-none min-w-[120px] justify-between">
            {ecoFilter === 'All' ? 'All Ecosystems' : ecoFilter}
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#0d0e10] border-white/10 text-zinc-300 p-1 min-w-[120px]">
            {ecosystems.map(e => (
              <DropdownMenuItem key={e} onClick={() => setEcoFilter(e)} className={cn("text-[11px] cursor-pointer focus:bg-white/5 rounded capitalize", ecoFilter === e && "text-[#22c55e]")}>
                {e === 'All' ? 'All Ecosystems' : e}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-[10px] text-zinc-600 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="border border-white/[0.05] rounded-xl overflow-hidden bg-card shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/[0.02] border-b border-white/[0.05]">
              <tr>
                <th className="px-4 py-3 font-bold text-[9px] uppercase tracking-widest text-zinc-500">Repository</th>
                <th className="px-4 py-3 font-bold text-[9px] uppercase tracking-widest text-zinc-500">Ecosystem</th>
                <th className="px-4 py-3 font-bold text-[9px] uppercase tracking-widest text-zinc-500">Status</th>
                <th className="px-4 py-3 font-bold text-[9px] uppercase tracking-widest text-zinc-500">Components</th>
                <th className="px-4 py-3 font-bold text-[9px] uppercase tracking-widest text-zinc-500">Vulnerabilities</th>
                <th className="px-4 py-3 font-bold text-[9px] uppercase tracking-widest text-zinc-500 text-center">NTIA</th>
                <th className="px-4 py-3 font-bold text-[9px] uppercase tracking-widest text-zinc-500">Date</th>
                <th className="px-4 py-3 font-bold text-[9px] uppercase tracking-widest text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <ScanSearch className="h-9 w-9 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-600 text-xs">No scans found{search ? ` for "${search}"` : ''}.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((scan) => (
                  <tr key={scan.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-200 text-[13px] leading-tight mb-0.5">{scan.repo_name || '—'}</p>
                      <CopyId id={scan.id} />
                    </td>
                    <td className="px-4 py-3"><EcoBadge eco={scan.ecosystem || ''} status={scan.status} /></td>
                    <td className="px-4 py-3"><StatusPill status={scan.status} /></td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-semibold text-zinc-300">{(scan.component_count ?? 0).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <VulnBadges
                        crit={scan.critical_cves ?? 0}
                        high={scan.high_cves ?? 0}
                        med={scan.medium_cves ?? 0}
                        low={scan.low_cves ?? 0}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {scan.status === 'done' ? (() => {
                        const s = getComplianceStatus(scan.ntia_score ?? 0);
                        return (
                          <span className={cn(
                            "inline-block text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest",
                            s.color === 'green' ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" :
                            s.color === 'amber' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-red-500/10 text-red-400 border-red-500/20"
                          )}>
                            {s.label}
                          </span>
                        );
                      })() : <span className="text-[10px] text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] text-zinc-400"
                        title={new Date(scan.created_at).toLocaleString()}
                      >
                        {relativeTime(scan.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/scans/${scan.id}`}
                          className="text-[9px] font-bold uppercase tracking-widest text-[#22c55e] hover:text-[#16a34a] border border-[#22c55e]/30 hover:border-[#22c55e]/60 px-2 py-0.5 rounded transition-all"
                        >
                          View
                        </Link>
                        {scan.status === 'done' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 border border-white/10 hover:border-white/20 px-2 py-0.5 rounded transition-all flex items-center gap-1 focus:outline-none">
                              ↓ <ChevronDown className="h-2.5 w-2.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#0d0e10] border-white/10 text-zinc-300 p-1 min-w-[130px]">
                              <DropdownMenuItem
                                className="text-[11px] cursor-pointer focus:bg-white/5 rounded"
                                onClick={() => downloadPDFReport(scan.id)}
                              >
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[11px] cursor-pointer focus:bg-white/5 rounded"
                                onClick={() => window.location.href = `/dashboard/scans/${scan.id}?tab=sbom`}
                              >
                                Export SBOM
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
