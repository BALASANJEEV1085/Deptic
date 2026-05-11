"use client";

import { useEffect, useState, useMemo } from "react";
import { getAllVulnerabilities, Vulnerability, shortId } from "@/lib/api";
import { Loader2, ShieldCheck, ShieldAlert, AlertCircle, ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === 'CRITICAL' ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]' :
    severity === 'HIGH'     ? 'bg-orange-500 text-white' :
    severity === 'MEDIUM'   ? 'bg-amber-500 text-black' :
                               'bg-zinc-700 text-zinc-300';
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded text-[9px] font-extrabold uppercase tracking-widest", cls)}>
      {severity}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      {[1,2,3,4,5,6].map(i => (
        <td key={i} className="px-5 py-4">
          <div className="h-3 bg-white/[0.04] rounded animate-pulse" style={{ width: `${45 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  useEffect(() => {
    getAllVulnerabilities()
      .then((res) => { setVulns(res.vulnerabilities || []); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const filteredVulns = useMemo(() => {
    if (!vulns) return [];
    if (severityFilter === "All") return vulns;
    return vulns.filter((v) => v.severity === severityFilter);
  }, [vulns, severityFilter]);

  // Summary counts
  const summary = useMemo(() => {
    if (!vulns) return { critical: 0, high: 0, medium: 0, low: 0 };
    return {
      critical: vulns.filter(v => v.severity === 'CRITICAL').length,
      high:     vulns.filter(v => v.severity === 'HIGH').length,
      medium:   vulns.filter(v => v.severity === 'MEDIUM').length,
      low:      vulns.filter(v => v.severity === 'LOW').length,
    };
  }, [vulns]);

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-20">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-2xl text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">Vulnerability Retrieval Error</h2>
          <p className="text-sm opacity-70 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="text-white bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-0 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Vulnerability Feed</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">Consolidated CVEs detected across your supply chain.</p>
        </div>
      </div>

      {/* Summary bar + severity filter */}
      {!loading && vulns && vulns.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Summary counts */}
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <span className="text-xs font-bold text-zinc-500">Total <span className="text-white">{vulns.length}</span></span>
            <span className="text-[10px] text-zinc-700">|</span>
            <span className="text-[10px] font-bold text-red-400">🔴 CRIT {summary.critical}</span>
            <span className="text-[10px] font-bold text-orange-400">🟠 HIGH {summary.high}</span>
            <span className="text-[10px] font-bold text-amber-400">🟡 MED {summary.medium}</span>
            <span className="text-[10px] font-bold text-zinc-400">🟢 LOW {summary.low}</span>
          </div>

          {/* Severity dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-xs font-bold text-zinc-400 hover:bg-white/[0.04] transition-colors focus:outline-none min-w-[160px] justify-between">
                {severityFilter === "All" ? "All Severities" : severityFilter}
                <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0d0e10] border-white/10 text-zinc-300 p-1 min-w-[160px]">
              {["All", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(s => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={cn("text-xs cursor-pointer focus:bg-white/5 rounded uppercase tracking-widest font-bold", severityFilter === s && "text-[#22c55e]")}
                >
                  {s === "All" ? "All Severities" : s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div className="border border-white/[0.05] rounded-xl overflow-hidden bg-card">
          <table className="w-full">
            <tbody>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
          </table>
        </div>
      ) : !vulns || vulns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-xl border border-white/[0.05] bg-white/[0.01]">
          <div className="h-20 w-20 rounded-full bg-[#22c55e]/5 flex items-center justify-center mb-6 border border-[#22c55e]/10">
            <ShieldCheck className="h-10 w-10 text-[#22c55e] opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Immune Environment</h3>
          <p className="text-zinc-500 text-sm max-w-sm text-center">
            Zero vulnerabilities detected across your supply chain.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.05] bg-card overflow-x-auto shadow-2xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.02] border-b border-white/[0.05]">
              <tr>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500">Project</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500">Affected Library</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500">CVE Reference</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500 text-center">Threat Level</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500">Fixed In</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredVulns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-zinc-600 text-sm">
                    No results for severity &ldquo;{severityFilter}&rdquo;
                  </td>
                </tr>
              ) : (
                filteredVulns.map((v, i) => (
                  <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                    {/* Project */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]/40 shrink-0" />
                        <span className="text-[13px] font-bold text-white leading-tight truncate max-w-[140px]">
                          {v.project_name || 'Unknown'}
                        </span>
                      </div>
                      {v.scan_id && (
                        <p className="text-[10px] font-mono text-zinc-600 mt-0.5 pl-3">
                          #{shortId(v.scan_id)}
                        </p>
                      )}
                    </td>

                    {/* Library */}
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-zinc-200">{v.component_name}</p>
                      <p className="text-[10px] font-mono text-zinc-500">v{v.component_version}</p>
                    </td>

                    {/* CVE — clickable link */}
                    <td className="px-5 py-4">
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${v.cve_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20 hover:bg-blue-400/20 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        {v.cve_id} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </td>

                    {/* Severity badge */}
                    <td className="px-5 py-4 text-center">
                      <SeverityBadge severity={v.severity} />
                    </td>

                    {/* Fixed in */}
                    <td className="px-5 py-4">
                      {v.fixed_version ? (
                        <span className="text-[10px] font-mono text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded">
                          {v.fixed_version}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600 italic">No fix</span>
                      )}
                    </td>

                    {/* Inspect button */}
                    <td className="px-5 py-4 text-right">
                      {v.scan_id && (
                        <Link
                          href={`/dashboard/scans/${v.scan_id}`}
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/20 px-2.5 py-1 rounded transition-all"
                        >
                          Inspect <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
