"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, FileBarChart2, ShieldCheck, AlertTriangle, Download } from 'lucide-react';
import { listScans, Scan, getCompliance, ComplianceResponse, shortId, relativeTime, ecosystemLabel, ecosystemColorClass, ntiaScoreColor, downloadPDFReport } from '@/lib/api';
import { cn } from '@/lib/utils';

type ReportRow = Scan & {
  compliance?: ComplianceResponse | null;
  compLoading: boolean;
};

function EcoBadge({ eco }: { eco: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
      ecosystemColorClass(eco)
    )}>
      {ecosystemLabel(eco)}
    </span>
  );
}

function NtiaScoreCell({ score, loading }: { score: number | undefined; loading: boolean }) {
  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-zinc-600 mx-auto" />;
  if (score === undefined) return <span className="text-zinc-600 text-xs italic">N/A</span>;

  const pct = Math.min(100, Math.max(0, score));
  const color = ntiaScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={cn("text-lg font-extrabold leading-none", color)}>{score}</span>
      {/* mini progress bar */}
      <div className="w-16 h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", score === 100 ? 'bg-[#22c55e]' : score >= 60 ? 'bg-orange-500' : 'bg-red-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ComplianceBadge({ compliant, loading }: { compliant: boolean | undefined; loading: boolean }) {
  if (loading) return <span className="text-zinc-600 text-xs">—</span>;
  if (compliant === undefined) return <span className="text-zinc-600 text-xs italic">N/A</span>;
  if (compliant) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
        <ShieldCheck className="h-3 w-3" /> Compliant
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-extrabold uppercase tracking-widest bg-red-600 text-white border border-red-600">
      <AlertTriangle className="h-3 w-3" /> Non-Compliant
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

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'compliant' | 'non-compliant'>('all');
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    listScans().then(async (res) => {
      const rows: ReportRow[] = res.scans.map(s => ({ ...s, compLoading: true }));
      setReports(rows);
      setLoading(false);

      for (const row of rows) {
        if (row.status === 'done') {
          try {
            const comp = await getCompliance(row.id);
            setReports(cur => cur.map(r => r.id === row.id ? { ...r, compliance: comp, compLoading: false } : r));
          } catch {
            setReports(cur => cur.map(r => r.id === row.id ? { ...r, compliance: null, compLoading: false } : r));
          }
        } else {
          setReports(cur => cur.map(r => r.id === row.id ? { ...r, compLoading: false } : r));
        }
      }
    }).catch(err => { console.error(err); setLoading(false); });
  }, []);

  const handlePDF = async (id: string) => {
    setPdfLoading(prev => ({ ...prev, [id]: true }));
    try { await downloadPDFReport(id); }
    catch (e) { console.error(e); }
    finally { setPdfLoading(prev => ({ ...prev, [id]: false })); }
  };

  const filteredReports = reports.filter(r => {
    const repoName = (r.repo_name || r.id).toLowerCase();
    if (!repoName.includes(searchQuery.toLowerCase())) return false;
    if (filter === 'compliant') return r.compliance?.ntia.compliant === true;
    if (filter === 'non-compliant') return r.compliance && r.compliance.ntia.compliant === false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.04] pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3 mb-1">
            <FileBarChart2 className="h-7 w-7 text-[#22c55e]" />
            Compliance Reports
          </h1>
          <p className="text-sm text-zinc-500">NTIA EO14028 compliance reports for your repositories.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search by repository..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#22c55e]/40 transition-colors"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex p-1 bg-white/[0.02] border border-white/[0.06] rounded-lg gap-0.5">
          <button
            onClick={() => setFilter('all')}
            className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", filter === 'all' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
          >
            All
          </button>
          <button
            onClick={() => setFilter('compliant')}
            className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", filter === 'compliant' ? "bg-[#22c55e] text-black" : "text-zinc-500 hover:text-zinc-300")}
          >
            Compliant
          </button>
          <button
            onClick={() => setFilter('non-compliant')}
            className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", filter === 'non-compliant' ? "bg-red-500 text-white" : "text-zinc-500 hover:text-zinc-300")}
          >
            Non-Compliant
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-white/[0.05] rounded-xl overflow-hidden bg-card shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.02] border-b border-white/[0.05]">
              <tr>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500">Repository / Scan</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500">Date</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500">Ecosystem</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500">Components</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500 text-center">NTIA Score</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500 text-center">EU CRA</th>
                <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-20 text-center">
                    <FileBarChart2 className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-600 text-sm">
                      {searchQuery ? `No reports matching "${searchQuery}"` : 'No reports found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const score = report.compliance?.ntia.score;
                  const euCompliant = report.compliance?.eu_cra_compliant;
                  return (
                    <tr key={report.id} className="group hover:bg-white/[0.02] transition-colors">
                      {/* Repo / Scan */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-white text-sm leading-tight">
                          {report.repo_name || '—'}
                        </p>
                        <p className="text-zinc-600 text-[10px] font-mono mt-0.5">#{shortId(report.id)}</p>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        <span
                          className="text-xs text-zinc-400"
                          title={new Date(report.created_at).toLocaleString()}
                        >
                          {relativeTime(report.created_at)}
                        </span>
                      </td>

                      {/* Ecosystem */}
                      <td className="px-5 py-4">
                        <EcoBadge eco={report.ecosystem || ''} />
                      </td>

                      {/* Component count */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-zinc-300">
                          {(report.component_count ?? 0).toLocaleString()}
                        </span>
                      </td>

                      {/* NTIA Score */}
                      <td className="px-5 py-4 text-center">
                        <NtiaScoreCell score={score} loading={report.compLoading} />
                      </td>

                      {/* EU CRA */}
                      <td className="px-5 py-4 text-center">
                        <ComplianceBadge compliant={euCompliant} loading={report.compLoading} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/scans/${report.id}?tab=compliance`}
                            className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/20 px-2.5 py-1 rounded transition-all"
                          >
                            View
                          </Link>
                          {report.status === 'done' && (
                            <button
                              onClick={() => handlePDF(report.id)}
                              disabled={pdfLoading[report.id]}
                              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-[#22c55e] hover:bg-[#16a34a] text-black px-2.5 py-1 rounded transition-all disabled:opacity-50"
                            >
                              {pdfLoading[report.id]
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Download className="h-3 w-3" />}
                              PDF
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
