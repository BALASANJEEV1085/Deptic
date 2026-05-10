"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { getScan, GetScanResponse, getScanVulnerabilities, ScanVulnerabilitiesResponse, generateSBOM, createShareLink } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Download, Package, Layers, ShieldCheck, ShieldAlert, Share2, Copy, CheckCircle2, ChevronDown, ExternalLink, Globe, AlertTriangle, ArrowLeft, MoreVertical, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ScanResultsPage() {
  const params = useParams();
  const scanId = params.scanId as string;

  const [data, setData] = useState<GetScanResponse | null>(null);
  const [vulnData, setVulnData] = useState<ScanVulnerabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'vulnerabilities' | 'bom'>('vulnerabilities');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLabel, setShareLabel] = useState("");
  const [shareExpires, setShareExpires] = useState(30);
  const [shareLink, setShareLink] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Last generated SBOM tracking for sharing
  const [lastSbomId, setLastSbomId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExport = async (format: "cyclonedx" | "spdx") => {
    try {
      setGenerating(true);
      const res = await generateSBOM(scanId, format);
      setLastSbomId(res.sbom_id);
      
      const link = document.createElement("a");
      link.href = res.download_url;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Artifact generated successfully");
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateShare = async () => {
    if (!lastSbomId) {
      alert("Please export an SBOM first to create a secure share link.");
      return;
    }
    try {
      setSharing(true);
      const res = await createShareLink(lastSbomId, shareLabel, shareExpires);
      setShareLink(res.share_url);
    } catch (err: any) {
      alert("Share failed: " + err.message);
    } finally {
      setSharing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!scanId) return;
    
    Promise.all([
      getScan(scanId),
      getScanVulnerabilities(scanId).catch(err => {
        console.error("Failed to load vulns", err);
        return { summary: { critical: 0, high: 0, medium: 0, low: 0 }, vulnerabilities: [] };
      })
    ])
      .then(([scanRes, vulnRes]) => {
        setData(scanRes);
        setVulnData(vulnRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [scanId]);

  const filteredComponents = useMemo(() => {
    if (!data?.components) return [];
    if (!searchQuery) return data.components;
    const lowerQuery = searchQuery.toLowerCase();
    return data.components.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.license.toLowerCase().includes(lowerQuery)
    );
  }, [data?.components, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-20">
        <div className="bg-red-500/5 border border-red-500/10 text-red-400 p-10 rounded-2xl text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-6 opacity-30" />
          <h2 className="text-2xl font-bold text-white mb-2">Audit Retrieval Failure</h2>
          <p className="text-sm opacity-60 mb-8">{error || "The requested security audit could not be found."}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl">
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  const directDepsCount = data.components.filter(c => c.depth === 0).length;
  const transitiveDepsCount = data.total - directDepsCount;
  const uniqueLicensesCount = new Set(data.components.map(c => c.license)).size;

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/[0.04] pb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
             <Link href="/dashboard/scans" className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 transition-all">
                <ArrowLeft className="h-4 w-4 text-zinc-400" />
             </Link>
             <div className="h-px w-4 bg-white/10" />
             <h1 className="text-2xl font-extrabold tracking-tight text-white">Supply Chain Audit</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-zinc-500">Audit ID:</span>
            <span className="text-zinc-300">{scanId}</span>
            <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-0 rounded-md px-2 py-0 text-[9px] uppercase font-bold tracking-widest">
              Authenticated
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button disabled={generating} className="bg-white text-black hover:bg-zinc-200 h-11 px-6 rounded-xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95 transition-all">
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Generate Artifact
                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-white/10 text-zinc-300 shadow-2xl p-1">
              <DropdownMenuItem onClick={() => handleExport("cyclonedx")} className="cursor-pointer focus:bg-white/5 py-2 px-3 rounded-md transition-colors">
                <FileText className="mr-2 h-4 w-4 text-zinc-500" />
                CycloneDX JSON (.json)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("spdx")} className="cursor-pointer focus:bg-white/5 py-2 px-3 rounded-md transition-colors">
                <FileText className="mr-2 h-4 w-4 text-zinc-500" />
                SPDX Tag-Value (.spdx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5 h-11 px-6 rounded-xl font-bold transition-all"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Secure Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Inventory Size', value: data.total, icon: Package, color: 'text-zinc-500' },
          { label: 'Direct Library', value: directDepsCount, icon: Layers, color: 'text-indigo-400' },
          { label: 'Transitive', value: transitiveDepsCount, icon: Layers, color: 'text-purple-400' },
          { label: 'License Spread', value: uniqueLicensesCount, icon: ShieldCheck, color: 'text-emerald-400' },
          { label: 'Active Threats', value: vulnData?.summary.critical || 0, icon: ShieldAlert, color: vulnData?.summary.critical ? 'text-red-400' : 'text-zinc-600' },
        ].map((stat, i) => (
          <div key={i} className="group relative rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 transition-all hover:bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em]">{stat.label}</span>
            </div>
            <div className="text-xl font-extrabold text-white tracking-tight">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* TAB SWITCHER */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.02] border border-white/[0.04] rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('vulnerabilities')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'vulnerabilities' 
              ? "bg-white text-black shadow-lg shadow-white/5" 
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
          )}
        >
          <ShieldAlert className={cn("h-3.5 w-3.5", activeTab === 'vulnerabilities' ? "text-red-600" : "text-zinc-600")} />
          Vulnerability Analysis
        </button>
        <button
          onClick={() => setActiveTab('bom')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'bom' 
              ? "bg-white text-black shadow-lg shadow-white/5" 
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
          )}
        >
          <Package className={cn("h-3.5 w-3.5", activeTab === 'bom' ? "text-indigo-600" : "text-zinc-600")} />
          Bill of Materials
        </button>
      </div>

      {activeTab === 'vulnerabilities' && vulnData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Security Findings
            </h2>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-red-500/5 rounded-full flex items-center gap-2 border border-red-500/10">
                <div className="h-1 w-1 rounded-full bg-red-500" />
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">{vulnData.summary.critical} Critical</span>
              </div>
              <div className="px-3 py-1 bg-orange-500/5 rounded-full flex items-center gap-2 border border-orange-500/10">
                <div className="h-1 w-1 rounded-full bg-orange-500" />
                <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">{vulnData.summary.high} High</span>
              </div>
            </div>
          </div>

          {(vulnData.summary.critical + vulnData.summary.high + vulnData.summary.medium + vulnData.summary.low) === 0 ? (
            <div className="bg-emerald-500/[0.02] border border-emerald-500/10 text-emerald-400 p-8 rounded-2xl flex items-center gap-6 shadow-inner">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-white mb-1">Authenticated Environment Clean</p>
                <p className="text-xs opacity-60">No vulnerabilities detected matching the specified inventory baseline.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.04] bg-card overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-white/[0.01]">
                  <TableRow className="border-white/[0.04]">
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold">Component</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold">Reference</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold text-center">Severity</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold">Mitigation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulnData.vulnerabilities.map((v, i) => (
                    <TableRow key={i} className="border-white/[0.04] hover:bg-white/[0.005] transition-colors">
                      <TableCell className="px-6 py-5">
                        <p className="font-bold text-zinc-100 text-[13px] mb-1">{v.component_name}</p>
                        <p className="text-[9px] text-zinc-600 font-mono italic">v{v.component_version}</p>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-400/5 px-2 py-0.5 rounded border border-indigo-400/10 underline decoration-indigo-400/20 underline-offset-4 cursor-pointer hover:bg-indigo-400/10 transition-colors">{v.cve_id}</span>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-center">
                         <Badge 
                           variant="outline" 
                           className={cn(
                             "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border-0",
                             v.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                             v.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                             'bg-zinc-800 text-zinc-500'
                           )}
                         >
                           {v.severity}
                         </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        {v.fixed_version ? (
                          <div className="flex items-center gap-2 text-emerald-500">
                             <CheckCircle2 className="h-3.5 w-3.5" />
                             <span className="text-[11px] font-bold">Patch to {v.fixed_version} available</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">Awaiting Fix</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bom' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-[13px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Package className="h-4 w-4 text-zinc-600" />
              Software Bill of Materials
            </h2>
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 group-focus-within:text-white transition-colors" />
              <Input
                placeholder="Search library, license or version..."
                className="pl-11 bg-white/[0.02] border-white/10 text-white h-11 rounded-xl focus:ring-indigo-500/40 text-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.04] bg-card overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-white/[0.01]">
                <TableRow className="border-white/[0.04]">
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold">Package Information</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold">Release</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold">License</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 text-right font-bold">Origin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-white/[0.04]">
                {filteredComponents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center text-zinc-600 italic">
                      Query returned zero results
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComponents.map((c) => (
                    <TableRow key={c.id} className="border-white/[0.04] hover:bg-white/[0.005] transition-colors">
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            c.depth === 0 ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-zinc-800"
                          )} />
                          <div>
                            <p className="font-bold text-zinc-200 text-[13px] mb-0.5">{c.name}</p>
                            {c.depth > 0 && <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">via {c.parent_name}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <code className="text-[11px] text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded-md font-mono">{c.version}</code>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-md border",
                          c.license === 'Unknown' ? 'bg-red-500/5 text-red-500/50 border-red-500/10' : 'bg-white/[0.02] text-zinc-500 border-white/5'
                        )}>
                          {c.license}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-right text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                        {c.ecosystem}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
           <div className="relative bg-card border-white/10 rounded-2xl w-full max-w-md p-10 shadow-3xl border animate-in zoom-in-95 duration-200">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Public Artifact Share</h2>
              <p className="text-zinc-500 text-xs mb-10 leading-relaxed font-medium">Generate a cryptographic share link for external auditing. This link will be accessible without authentication.</p>
              
              {!shareLink ? (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 block px-1">Reference Title</label>
                    <Input 
                      placeholder='e.g. "Q1 Compliance Review"' 
                      className="bg-white/[0.02] border-white/10 text-white h-12 rounded-xl focus:ring-indigo-500/40"
                      value={shareLabel}
                      onChange={(e) => setShareLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 block px-1">Persistence Window</label>
                    <select 
                      className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-xl px-4 text-xs font-bold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none cursor-pointer"
                      value={shareExpires}
                      onChange={(e) => setShareExpires(Number(e.target.value))}
                    >
                      <option value={30}>30 Days (Standard Audit)</option>
                      <option value={90}>90 Days (Extended Review)</option>
                      <option value={365}>1 Year (Archival)</option>
                    </select>
                  </div>
                  <div className="pt-6 flex gap-4">
                    <Button variant="ghost" className="flex-1 text-zinc-500 hover:text-white font-bold h-11" onClick={() => setShowShareModal(false)}>Dismiss</Button>
                    <Button className="flex-1 bg-white text-black hover:bg-zinc-200 h-11 font-bold rounded-xl" onClick={handleCreateShare} disabled={sharing || !lastSbomId}>
                      {sharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Link
                    </Button>
                  </div>
                  {!lastSbomId && (
                    <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-500/70 leading-relaxed font-medium">An SBOM artifact must be generated via the "Generate Artifact" menu before a share link can be initialized.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl text-emerald-400 flex gap-4 shadow-inner">
                    <Globe className="h-6 w-6 shrink-0 opacity-60" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-1">Decentralized Access Live</p>
                      <p className="text-[10px] leading-relaxed opacity-70">This link provides instant, read-only access to the generated supply chain audit report.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 relative group">
                    <Input readOnly value={shareLink} className="font-mono text-[10px] bg-white/[0.01] border-white/10 h-12 pr-24 rounded-xl text-zinc-400" />
                    <Button onClick={copyToClipboard} className="absolute right-1 top-1 h-10 w-20 bg-white text-black hover:bg-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <Button variant="ghost" className="w-full text-zinc-600 hover:text-zinc-300 h-12 font-bold uppercase tracking-widest text-[10px]" onClick={() => setShowShareModal(false)}>Complete Session</Button>
                </div>
              )}
           </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-10 right-10 z-[200] bg-white text-black px-8 py-4 rounded-2xl shadow-3xl flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-500 border border-white/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-extrabold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
