"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { getPublicShare } from "@/lib/api";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, FileJson, Package, Layers, Globe, Clock, Hash, AlertTriangle, ExternalLink, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Link from "next/link";

function EcoDot({ eco }: { eco: string }) {
  const e = (eco || 'unknown').toLowerCase();
  switch (e) {
    case 'npm': return <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />;
    case 'pip': return <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />;
    case 'maven': return <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />;
    default: return <div className="h-2 w-2 rounded-full bg-zinc-600" />;
  }
}

export default function PublicSharePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getPublicShare(token)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        if (err.message === "Expired") {
          setError("expired");
        } else {
          setError("failed");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const formattedDate = useMemo(() => {
    if (!data?.generated_at) return "N/A";
    try {
      const d = new Date(data.generated_at);
      if (isNaN(d.getTime())) return "N/A";
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return "N/A";
    }
  }, [data?.generated_at]);

  const directCount = useMemo(() => {
    if (!data?.components) return 0;
    return data.components.filter((c: any) => c.Depth === 0).length;
  }, [data?.components]);

  const transitiveCount = useMemo(() => {
    if (!data?.components) return 0;
    return data.components.filter((c: any) => c.Depth > 0).length;
  }, [data?.components]);

  const groupedComponents = useMemo(() => {
    if (!data?.components) return { direct: [], transitive: [] };
    return {
      direct: data.components.filter((c: any) => c.Depth === 0),
      transitive: data.components.filter((c: any) => c.Depth > 0)
    };
  }, [data?.components]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] text-zinc-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#22c55e] border-t-transparent" />
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-600">Decrypting Audit Log...</div>
        </div>
      </div>
    );
  }

  if (error === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] px-6">
        <div className="text-center p-12 bg-[#0f1117] border border-red-500/20 rounded-3xl max-w-md w-full shadow-2xl">
          <div className="h-16 w-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Audit Link Expired</h1>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8">
            Access to this secure compliance report has been revoked due to expiration. Please contact the project administrator for a refreshed manifest.
          </p>
          <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-zinc-600">
            <ShieldCheck className="h-4 w-4 opacity-30" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">Verified by SBOM.io</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] text-red-400 p-6 text-center">
        <div className="max-w-md">
          <AlertTriangle className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p className="font-bold mb-1">Authorization Failed</p>
          <p className="text-sm opacity-60">The security token provided is invalid or has been manually revoked by the issuer.</p>
        </div>
      </div>
    );
  }

  const { compliance = {}, vulnerability_summary = {} } = data;

  return (
    <div className="min-h-screen bg-[#0a0c10] text-zinc-300 selection:bg-[#22c55e]/30 selection:text-[#22c55e]">
      {/* Top Banner */}
      <div className="bg-[#0d2818] px-6 py-2 text-center border-b border-[#22c55e]/10">
        <p className="text-[10px] font-bold text-[#22c55e] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <Globe className="h-3 w-3 text-[#22c55e]" /> SECURE PUBLIC REPORT — READ ONLY ACCESS AUTHORIZED
        </p>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-6 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/5 pb-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <svg width="28" height="28" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#22c55e]">
                <path d="M60 30L90 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M90 60L60 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M60 90L30 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M30 60L60 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-bold text-lg text-white tracking-tight">SBOM.io</span>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Software Compliance Report</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Project:</span>
                <span className="text-sm font-bold text-white uppercase tracking-tight">{data.repo_name}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-y-3 text-right">
             <div className="flex items-center gap-2 justify-end text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Ref: <span className="text-zinc-300 font-mono">{(data.sha256_hash || data.sha256 || '').substring(0, 16)}</span>
             </div>
             <div className="flex items-center gap-2 justify-end text-xs">
                <Clock className="h-3 w-3 text-zinc-600" />
                <span className="text-zinc-500 font-medium">{formattedDate}</span>
             </div>
             <div className="flex items-center justify-end pt-2">
                <a 
                  href={`/api/share/${token}/download`}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#22c55e]/30 rounded-xl text-[11px] font-bold text-[#22c55e] hover:bg-[#22c55e]/5 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  ↓ Download CycloneDX
                </a>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* NTIA Checklist */}
          <div className="lg:col-span-1">
            <div className="bg-[#0f1117] border border-white/5 rounded-2xl p-6 h-full">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-[#22c55e]" /> NTIA Minimum Elements
              </h2>
              <ul className="space-y-4">
                {[
                  { key: 'has_supplier_name', label: 'Supplier Name' },
                  { key: 'has_component_names', label: 'Component Names' },
                  { key: 'has_versions', label: 'Versions' },
                  { key: 'has_unique_ids', label: 'Unique Identifiers' },
                  { key: 'has_dependency_relationships', label: 'Dependency Graph' },
                  { key: 'has_author', label: 'Data Author' },
                  { key: 'has_timestamp', label: 'Audit Timestamp' }
                ].map(item => (
                  <li key={item.key} className="flex items-center justify-between text-xs">
                    <span className={compliance[item.key] ? "text-zinc-300" : "text-zinc-600"}>
                      {item.label}
                    </span>
                    {compliance[item.key] ? (
                      <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-zinc-600" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Protocol</span>
                </div>
                <Badge variant="outline" className="text-[#22c55e] border-[#22c55e]/30 bg-transparent text-[10px] uppercase font-mono">{data.format} {data.spec_version}</Badge>
              </div>
            </div>
          </div>

          {/* Stats & Posture */}
          <div className="lg:col-span-3 space-y-8">
            {/* Vuln Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Critical', value: vulnerability_summary.critical || 0, color: 'text-red-500', bg: 'bg-red-500/15', border: 'border-red-500/20' },
                { label: 'High', value: vulnerability_summary.high || 0, color: 'text-orange-500', bg: 'bg-orange-500/15', border: 'border-orange-500/20' },
                { label: 'Medium', value: vulnerability_summary.medium || 0, color: 'text-yellow-500', bg: 'bg-yellow-500/15', border: 'border-yellow-500/20' },
                { label: 'Low', value: vulnerability_summary.low || 0, color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/15', border: 'border-[#22c55e]/20' },
              ].map((v, i) => (
                <div key={i} className={cn("rounded-2xl border p-6 flex flex-col items-center justify-center gap-2", v.bg, v.border)}>
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">{v.label}</span>
                  <span className={cn("text-3xl font-black", v.color)}>{v.value}</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">vulnerabilities</span>
                </div>
              ))}
            </div>

            {/* Inventory Coverage visualization */}
            <div className="rounded-2xl border border-white/5 bg-[#0f1117] p-8 space-y-6 transition-all hover:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Inventory Coverage</h2>
                  <p className="text-sm text-zinc-500">Verified components extracted from primary manifests.</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#22c55e]">{data.component_count}</span>
                  <Package className="h-4 w-4 text-zinc-700" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-[#22c55e] transition-all duration-1000" 
                    style={{ width: `${(directCount / (data.component_count || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
                    <span className="text-zinc-300">Direct ({directCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-zinc-700" />
                    <span className="text-zinc-500">Transitive ({transitiveCount})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Components Ledger Table */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Layers className="h-5 w-5 text-[#22c55e]" /> Component Ledger
            </h2>
          </div>
          
          <div className="rounded-2xl border border-white/5 bg-[#0f1117] overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-white/[0.01]">
                <TableRow className="border-white/5">
                  <TableHead className="px-6 py-4 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Package Name</TableHead>
                  <TableHead className="px-6 py-4 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Release</TableHead>
                  <TableHead className="px-6 py-4 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">License</TableHead>
                  <TableHead className="px-6 py-4 text-zinc-500 text-[10px] uppercase tracking-widest font-bold text-right">Scope</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Direct dependencies */}
                {groupedComponents.direct.map((c: any, i: number) => (
                  <TableRow key={`dir-${i}`} className="hover:bg-white/[0.01] transition-colors border-white/5">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <EcoDot eco={c.Ecosystem} />
                        <span className="text-sm font-bold text-zinc-200">{c.Name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <code className="text-[10px] text-zinc-500 font-mono font-bold bg-white/5 px-2 py-0.5 rounded uppercase">{c.Version}</code>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-[10px] text-zinc-600 font-medium px-2 py-0.5 border border-white/5 rounded-md">{c.License || 'Proprietary'}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e] text-[9px] font-black uppercase tracking-widest border border-[#22c55e]/20">Direct</span>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Separator */}
                {groupedComponents.transitive.length > 0 && (
                  <TableRow className="bg-white/[0.01] border-none pointer-events-none">
                    <TableCell colSpan={4} className="py-2 px-6">
                      <div className="flex items-center gap-4">
                        <div className="h-[1px] flex-1 bg-white/5" />
                        <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.2em] whitespace-nowrap">
                          Direct dependencies above · Transitive below
                        </span>
                        <div className="h-[1px] flex-1 bg-white/5" />
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Transitive dependencies */}
                {groupedComponents.transitive.map((c: any, i: number) => (
                  <TableRow key={`trans-${i}`} className="hover:bg-white/[0.01] transition-colors border-white/5">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <EcoDot eco={c.Ecosystem} />
                        <span className="text-sm font-bold text-zinc-400">{c.Name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <code className="text-[10px] text-zinc-600 font-mono font-bold bg-white/5 px-2 py-0.5 rounded uppercase">{c.Version}</code>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-[10px] text-zinc-700 font-medium px-2 py-0.5 border border-white/5 rounded-md">{c.License || 'Proprietary'}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800/50 text-zinc-600 text-[9px] font-bold uppercase tracking-widest border border-white/5">Transitive</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-20 pb-10 border-t border-white/5 text-center space-y-8">
           <div className="flex flex-col items-center gap-3">
             <div className="flex items-center gap-3 mb-2">
                <svg width="24" height="24" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-700 opacity-50">
                  <path d="M60 30L90 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M90 60L60 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M60 90L30 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M30 60L60 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs font-black text-zinc-600 tracking-[0.3em] uppercase">Powered by SBOM.io</span>
             </div>
             <p className="text-[10px] text-zinc-700 font-medium">
               Report generated: {formattedDate} · Platform: <Link href="/" className="text-zinc-500 hover:text-[#22c55e] transition-colors underline underline-offset-4 decoration-zinc-800">sbom.io</Link>
             </p>
           </div>
           <p className="text-[9px] text-zinc-800 max-w-2xl mx-auto leading-relaxed">
             This cryptographic artifact is generated and signed by the SBOM.io platform. 
             Authorized for external auditing and supply chain transparency as per NIST and EU CRA 2024 directives.
           </p>
        </div>
      </div>
    </div>
  );
}
