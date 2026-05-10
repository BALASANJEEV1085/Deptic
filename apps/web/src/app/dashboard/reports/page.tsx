"use client";

import * as React from "react";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, FileBarChart2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { listScans, Scan, getCompliance, ComplianceResponse } from '@/lib/api';
import { cn } from "@/lib/utils";

type ReportRow = Scan & {
  compliance?: ComplianceResponse | null;
  compLoading: boolean;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'compliant' | 'non-compliant'>('all');

  useEffect(() => {
    listScans().then(async (res) => {
      // Map basic scans
      const rows: ReportRow[] = res.scans.map(s => ({ ...s, compLoading: true }));
      setReports(rows);
      setLoading(false);

      // Fetch compliance for each
      for (const row of rows) {
        if (row.status === 'done') {
          try {
            const comp = await getCompliance(row.id);
            setReports(current => current.map(r => r.id === row.id ? { ...r, compliance: comp, compLoading: false } : r));
          } catch (e) {
            setReports(current => current.map(r => r.id === row.id ? { ...r, compliance: null, compLoading: false } : r));
          }
        } else {
          setReports(current => current.map(r => r.id === row.id ? { ...r, compLoading: false } : r));
        }
      }
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.id.toLowerCase().includes(searchQuery.toLowerCase()) || r.project_id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === 'compliant') return r.compliance?.ntia.compliant === true;
    if (filter === 'non-compliant') return r.compliance && r.compliance.ntia.compliant === false;
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileBarChart2 className="h-8 w-8 text-indigo-500" />
            Compliance Reports
          </h1>
          <p className="mt-2 text-sm text-zinc-500">View and download NTIA EO14028 compliance reports for your repositories.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <Input
              placeholder="Search by ID..."
              className="pl-9 bg-white/[0.02] border-white/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex p-1 bg-white/[0.02] border border-white/[0.04] rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", filter === 'all' ? "bg-white text-black" : "text-zinc-500 hover:text-white")}
            >
              All
            </button>
            <button
              onClick={() => setFilter('compliant')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", filter === 'compliant' ? "bg-emerald-500 text-white" : "text-zinc-500 hover:text-white")}
            >
              Compliant
            </button>
            <button
              onClick={() => setFilter('non-compliant')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", filter === 'non-compliant' ? "bg-red-500 text-white" : "text-zinc-500 hover:text-white")}
            >
              Non-Compliant
            </button>
          </div>
        </div>

        <div className="border border-white/5 rounded-2xl overflow-hidden bg-card shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/[0.02] text-zinc-500 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Project / Scan ID</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Date Created</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center">NTIA Score</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center">EU CRA</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-zinc-600">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-500" />
                      Loading reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-zinc-600 italic">
                      No reports found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-5">
                        <p className="text-white text-xs font-mono mb-1">{report.project_id}</p>
                        <p className="text-zinc-600 text-[10px] font-mono">{report.id}</p>
                      </td>
                      <td className="px-6 py-5 text-zinc-400 text-xs">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {report.compLoading ? (
                           <Loader2 className="h-4 w-4 animate-spin text-zinc-600 mx-auto" />
                        ) : report.compliance ? (
                           <div className="flex flex-col items-center gap-1">
                             <span className={cn(
                               "text-lg font-extrabold",
                               report.compliance.ntia.score === 100 ? "text-emerald-500" :
                               report.compliance.ntia.score >= 60 ? "text-orange-500" : "text-red-500"
                             )}>
                               {report.compliance.ntia.score}
                             </span>
                             {report.compliance.ntia.compliant && <ShieldCheck className="h-3 w-3 text-emerald-500" />}
                           </div>
                        ) : (
                           <span className="text-zinc-600 text-xs italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                         {report.compLoading ? (
                           <span className="text-zinc-600">-</span>
                         ) : report.compliance?.eu_cra_compliant ? (
                           <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[9px] uppercase">Compliant</Badge>
                         ) : (
                           <Badge className="bg-red-500/10 text-red-400 border-0 text-[9px] uppercase">Non-Compliant</Badge>
                         )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link href={`/dashboard/scans/${report.id}?tab=compliance`}>
                          <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">View Report</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
