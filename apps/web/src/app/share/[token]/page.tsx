"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { getPublicShare } from "@/lib/api";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, FileJson, Package, Layers, Globe, Clock, Hash, AlertTriangle, ExternalLink } from "lucide-react";
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-zinc-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <div className="text-sm font-medium tracking-widest uppercase">Decrypting Audit Log...</div>
        </div>
      </div>
    );
  }

  if (error === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center p-12 bg-card border border-red-500/20 rounded-3xl max-w-md w-full shadow-2xl">
          <div className="h-16 w-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Audit Link Expired</h1>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8">
            Access to this secure compliance report has been revoked due to expiration. Please contact the project administrator for a refreshed manifest.
          </p>
          <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-zinc-600">
            <ShieldCheck className="h-4 w-4 opacity-30" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Verified by SBOM.io</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-red-400 p-6 text-center">
        <div className="max-w-md">
          <AlertTriangle className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p className="font-bold mb-1">Authorization Failed</p>
          <p className="text-sm opacity-60">The security token provided is invalid or has been manually revoked by the issuer.</p>
        </div>
      </div>
    );
  }

  const { compliance = {}, vulnerability_summary = {}, components = [], vulnerabilities = [] } = data;

  return (
    <div className="min-h-screen bg-background text-zinc-300 selection:bg-indigo-500/30 selection:text-indigo-400">
      {/* Top Banner */}
      <div className="bg-indigo-600 px-6 py-2 text-center">
        <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <Globe className="h-3 w-3" /> Secure Public Report — Read Only Access Authorized
        </p>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-6 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/5 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M60 30L90 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M90 60L60 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M60 90L30 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M30 60L60 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <g transform="translate(48, 18)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
                <g transform="translate(78, 48)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
                <g transform="translate(48, 78)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
                <g transform="translate(18, 48)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
              </svg>
              <span className="font-bold text-lg text-white tracking-tight">SBOM.io</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Software Compliance Report</h1>
            <p className="text-zinc-500 font-medium italic">Ref: {data.label}</p>
          </div>
          
          <div className="grid grid-cols-1 gap-y-3 text-right">
             <div className="flex items-center gap-2 justify-end text-xs">
                <span className="text-zinc-500 uppercase font-bold tracking-widest">Project</span>
                <span className="text-white font-bold">{data.repo_name}</span>
             </div>
             <div className="flex items-center gap-2 justify-end text-xs">
                <Clock className="h-3 w-3 text-zinc-600" />
                <span className="text-zinc-400">{formattedDate}</span>
             </div>
             <div className="flex items-center gap-2 justify-end text-xs">
                <Hash className="h-3 w-3 text-zinc-600" />
                <span className="font-mono text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{data.sha256}</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* NTIA Checklist */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 h-full">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> NTIA Minimum Elements
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
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
                <Badge className="bg-indigo-500/10 text-indigo-400 border-0 text-[10px] uppercase">{data.format} {data.spec_version}</Badge>
              </div>
            </div>
          </div>

          {/* Stats & Posture */}
          <div className="lg:col-span-3 space-y-8">
            {/* Vuln Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Critical', value: vulnerability_summary.critical || 0, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                { label: 'High', value: vulnerability_summary.high || 0, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                { label: 'Medium', value: vulnerability_summary.medium || 0, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                { label: 'Low', value: vulnerability_summary.low || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              ].map((v, i) => (
                <div key={i} className={cn("rounded-2xl border p-5 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-[1.02]", v.bg, v.border)}>
                  <span className={cn("text-2xl font-extrabold", v.color)}>{v.value}</span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", v.color)}>{v.label}</span>
                </div>
              ))}
            </div>

            {/* Component Count Glass Card */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 flex items-center justify-between transition-all hover:bg-white/[0.04]">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent -z-10" />
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Inventory Coverage</h2>
                <p className="text-sm text-zinc-500">Verified components extracted from primary manifests.</p>
              </div>
              <div className="flex items-baseline gap-2">
                 <span className="text-5xl font-black text-indigo-500">{data.component_count}</span>
                 <Package className="h-5 w-5 text-zinc-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Components Table */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-zinc-600" /> Component Ledger
            </h2>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Page 1 of {Math.ceil((components?.length || 0)/100)}</span>
          </div>
          <div className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-white/[0.02] sticky top-0 z-20">
                  <TableRow className="border-white/5">
                    <TableHead className="px-6 py-4 text-zinc-400 text-[10px] uppercase tracking-widest font-bold">Package Information</TableHead>
                    <TableHead className="px-6 py-4 text-zinc-400 text-[10px] uppercase tracking-widest font-bold">Release</TableHead>
                    <TableHead className="px-6 py-4 text-zinc-400 text-[10px] uppercase tracking-widest font-bold">License</TableHead>
                    <TableHead className="px-6 py-4 text-zinc-400 text-[10px] uppercase tracking-widest font-bold text-right">Scope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5">
                  {components.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-zinc-600 italic">Inventory list empty</TableCell></TableRow>
                  ) : components.map((c: any, i: number) => (
                    <TableRow key={i} className="hover:bg-white/[0.01] transition-colors border-white/5">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-1.5 w-1.5 rounded-full", c.Depth === 0 ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-zinc-700")} />
                          <span className="text-sm font-bold text-white leading-none">{c.Name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <code className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{c.Version}</code>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] font-medium text-zinc-400 border-zinc-800 bg-transparent px-2 py-0.5">{c.License || 'Proprietary'}</Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {c.Depth === 0 ? (
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Primary</span>
                        ) : (
                          <span className="text-[10px] text-zinc-600 uppercase">Dependency</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Vulnerabilities Section */}
        {vulnerabilities.length > 0 && (
          <div className="space-y-6 pt-12">
            <h2 className="text-xl font-bold text-red-400 flex items-center gap-3">
              <ShieldAlert className="h-6 w-6" /> Detected Vulnerabilities
            </h2>
            <div className="rounded-2xl border border-red-500/10 bg-card overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.05)]">
              <Table>
                <TableHeader className="bg-red-500/[0.02]">
                  <TableRow className="border-white/5">
                    <TableHead className="px-6 py-4 text-zinc-400 text-[10px] uppercase tracking-widest font-bold">CVE Reference</TableHead>
                    <TableHead className="px-6 py-4 text-zinc-400 text-[10px] uppercase tracking-widest font-bold text-center">Threat</TableHead>
                    <TableHead className="px-6 py-4 text-zinc-400 text-[10px] uppercase tracking-widest font-bold">Affected Identity</TableHead>
                    <TableHead className="px-6 py-4 text-zinc-400 text-[10px] uppercase tracking-widest font-bold text-right">Remediation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5">
                  {vulnerabilities.map((v: any, i: number) => (
                    <TableRow key={i} className="hover:bg-red-500/[0.01] transition-colors border-white/5">
                      <TableCell className="px-6 py-5">
                         <span className="text-xs font-mono text-white underline decoration-zinc-700 underline-offset-4">{v.cve_id}</span>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-center">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 border-0",
                            v.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                            v.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                            v.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-zinc-800 text-zinc-400'
                          )}
                        >
                          {v.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                         <div className="flex flex-col">
                           <span className="text-xs font-bold text-white">{v.component_name}</span>
                           <span className="text-[10px] text-zinc-500 font-mono">v{v.component_version}</span>
                         </div>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-right">
                        {v.fixed_version ? (
                          <div className="flex items-center justify-end gap-1.5 text-emerald-400 text-xs font-bold">
                            <span className="text-[10px] uppercase tracking-widest">Patch to</span>
                            <code className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{v.fixed_version}</code>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[10px] uppercase font-bold">No patch yet</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-24 pb-4 text-center border-t border-white/5 flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center">
               <ShieldCheck className="h-4 w-4 text-zinc-400" />
             </div>
             <span className="text-sm font-bold text-white tracking-widest uppercase">Verified Certification by SBOM.io</span>
          </div>
          <div className="flex gap-10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
             <span className="flex items-center gap-2"><ShieldCheck className="h-3 w-3" /> End-to-End Encrypted</span>
             <span className="flex items-center gap-2"><Globe className="h-3 w-3" /> Immutable Manifest</span>
          </div>
          <p className="text-[10px] text-zinc-700 italic">This document is a generated artifact and is legally valid for regulatory audits as per the EU CRA 2024 directives.</p>
        </div>
      </div>
    </div>
  );
}
