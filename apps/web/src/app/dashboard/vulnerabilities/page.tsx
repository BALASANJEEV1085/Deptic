"use client";

import { useEffect, useState, useMemo } from "react";
import { getAllVulnerabilities, Vulnerability } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShieldCheck, ShieldAlert, Filter, AlertCircle, ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  useEffect(() => {
    getAllVulnerabilities()
      .then((res) => {
        setVulns(res.vulnerabilities || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredVulns = useMemo(() => {
    if (!vulns) return [];
    if (severityFilter === "All") return vulns;
    return vulns.filter((v) => v.severity === severityFilter);
  }, [vulns, severityFilter]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !vulns) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-20">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-2xl text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">Vulnerability Retrieval Error</h2>
          <p className="text-sm opacity-70 mb-6">{error || "Failed to load global vulnerability feed."}</p>
          <button onClick={() => window.location.reload()} className="text-white bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const severities = ["All", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 md:px-0 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Vulnerability Feed</h1>
          </div>
          <p className="text-[13px] text-zinc-500">
            Consolidated view of all detected CVEs across your integrated infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-zinc-500 mr-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-white/10 rounded-xl bg-white/5 text-zinc-300 py-2.5 px-5 focus:outline-none hover:bg-white/10 transition-all min-w-[160px] justify-between">
                  {severityFilter === "All" ? "All Severities" : severityFilter}
                  <ChevronDown className="h-3 w-3 text-zinc-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-white/10 text-zinc-300 shadow-2xl p-1 min-w-[160px]">
                {severities.map((s) => (
                  <DropdownMenuItem 
                    key={s} 
                    onClick={() => setSeverityFilter(s)}
                    className={cn(
                      "cursor-pointer focus:bg-white/5 py-2 px-3 rounded-md transition-colors text-[10px] font-bold uppercase tracking-widest",
                      severityFilter === s ? "text-indigo-400 bg-white/5" : "text-zinc-500"
                    )}
                  >
                    {s === "All" ? "All Severities" : s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {vulns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-2xl border border-white/5 bg-white/[0.01]">
          <div className="h-20 w-20 rounded-full bg-emerald-500/5 flex items-center justify-center mb-8 border border-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.05)]">
            <ShieldCheck className="h-10 w-10 text-emerald-500 opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Immune Environment</h3>
          <p className="text-zinc-500 text-sm max-w-sm text-center">
            Zero vulnerabilities detected in your active supply chain. Maintain hygiene by scanning regularly.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-card overflow-x-auto shadow-2xl">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5">
                <TableHead className="px-6 py-4 text-zinc-400 text-[9px] uppercase tracking-widest font-bold">Project</TableHead>
                <TableHead className="px-6 py-4 text-zinc-400 text-[9px] uppercase tracking-widest font-bold">Affected Library</TableHead>
                <TableHead className="px-6 py-4 text-zinc-400 text-[9px] uppercase tracking-widest font-bold">CVE Reference</TableHead>
                <TableHead className="px-6 py-4 text-zinc-400 text-[9px] uppercase tracking-widest font-bold text-center">Threat Level</TableHead>
                <TableHead className="px-6 py-4 text-zinc-400 text-[9px] uppercase tracking-widest font-bold text-right">Context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/5">
              {filteredVulns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-600">
                    No results for filter "{severityFilter}"
                  </TableCell>
                </TableRow>
              ) : (
                filteredVulns.map((v, i) => (
                  <TableRow key={i} className="group hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500/40" />
                        <span className="text-[13px] font-bold text-white">
                          {v.project_name || "Internal App"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                       <div className="flex flex-col">
                         <span className="text-xs font-semibold text-zinc-200">{v.component_name}</span>
                         <span className="text-[10px] font-mono text-zinc-500">v{v.component_version}</span>
                       </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">
                        {v.cve_id}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border-0",
                          v.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                          v.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                          v.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-zinc-800 text-zinc-400'
                        )}
                      >
                        {v.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <Link href={`/dashboard/scans/${v.scan_id}`}>
                        <button className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-all">
                          Inspect <ExternalLink className="h-3 w-3" />
                        </button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
