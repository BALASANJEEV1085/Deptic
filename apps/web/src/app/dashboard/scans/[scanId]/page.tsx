"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { getScan, GetScanResponse, getScanVulnerabilities, ScanVulnerabilitiesResponse, generateSBOM, createShareLink, getCompliance, ComplianceResponse, downloadPDFReport, shortId } from "@/lib/api";
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
import { Loader2, Search, Download, Package, Layers, ShieldCheck, ShieldAlert, Share2, Copy, CheckCircle2, ChevronDown, ExternalLink, Globe, AlertTriangle, ArrowLeft, FileText, Check, X, FileBarChart2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function EcoDot({ eco }: { eco: string }) {
  switch (eco.toLowerCase()) {
    case 'npm': return <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />;
    case 'pip': return <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />;
    case 'maven': return <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />;
    default: return <div className="h-2 w-2 rounded-full bg-zinc-600" />;
  }
}

function LicenseBadge({ license }: { license: string }) {
  const l = license.toUpperCase();
  if (l.includes('MIT')) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">MIT</span>;
  if (l.includes('APACHE')) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Apache</span>;
  if (l.includes('GPL')) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">GPL</span>;
  if (l.includes('ISC')) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">ISC</span>;
  if (l === 'UNKNOWN') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-600 border border-zinc-700/50">Unknown</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-500/5 text-zinc-500 border border-zinc-500/10">{license}</span>;
}

export default function ScanResultsPage() {
  const params = useParams();
  const scanId = params.scanId as string;

  const [data, setData] = useState<GetScanResponse | null>(null);
  const [vulnData, setVulnData] = useState<ScanVulnerabilitiesResponse | null>(null);
  const [complianceData, setComplianceData] = useState<ComplianceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'vulnerabilities' | 'compliance' | 'bom'>('vulnerabilities');
  const [activeEcosystem, setActiveEcosystem] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>({});

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLabel, setShareLabel] = useState("");
  const [shareExpires, setShareExpires] = useState(30);
  const [shareLink, setShareLink] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  
  const [lastSbomId, setLastSbomId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const parseRepoName = (url: string) => {
    try {
      const parts = url.replace(/\/$/, '').split('/');
      if (parts.length >= 2) {
        return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const copyIdToClipboard = () => {
    navigator.clipboard.writeText(scanId);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const handleExport = async (format: "cyclonedx" | "spdx" | "pdf") => {
    try {
      setGenerating(true);
      if (format === "pdf") {
        await downloadPDFReport(scanId);
        showToast("PDF report downloaded successfully");
      } else {
        const res = await generateSBOM(scanId, format);
        setLastSbomId(res.sbom_id);
        const link = document.createElement("a");
        link.href = res.download_url;
        link.setAttribute("download", "");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Artifact generated successfully");
      }
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

  const toggleElement = (name: string) => {
    setExpandedElements(prev => ({ ...prev, [name]: !prev[name] }));
  };

  useEffect(() => {
    if (!scanId) return;
    
    Promise.all([
      getScan(scanId),
      getScanVulnerabilities(scanId).catch(err => {
        console.error("Failed to load vulns", err);
        return { summary: { critical: 0, high: 0, medium: 0, low: 0 }, vulnerabilities: [] };
      }),
      getCompliance(scanId).catch(err => {
        console.error("Failed to load compliance", err);
        return null;
      })
    ])
      .then(([scanRes, vulnRes, compRes]) => {
        setData(scanRes);
        setVulnData(vulnRes);
        setComplianceData(compRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [scanId]);

  const filteredComponents = useMemo(() => {
    if (!data?.components) return [];
    let filtered = data.components;
    
    if (activeEcosystem !== 'All') {
      filtered = filtered.filter(c => c.ecosystem === activeEcosystem);
    }
    
    if (!searchQuery) return filtered;
    const lowerQuery = searchQuery.toLowerCase();
    return filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.license.toLowerCase().includes(lowerQuery) ||
        c.version.toLowerCase().includes(lowerQuery) ||
        c.ecosystem.toLowerCase().includes(lowerQuery)
    );
  }, [data?.components, searchQuery, activeEcosystem]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#22c55e]" />
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
    <div className="max-w-6xl mx-auto py-6 md:py-10 px-4 md:px-6 space-y-8 md:space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/[0.04] pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-1">
             <Link href="/dashboard/scans" className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 transition-all">
                <ArrowLeft className="h-4 w-4 text-zinc-400" />
             </Link>
             <h1 className="text-3xl font-extrabold tracking-tight text-white">{parseRepoName(data.scan.repo_url)}</h1>
          </div>
          <p className="text-sm text-zinc-500 font-medium pl-11">Supply Chain Audit</p>
          <div className="flex items-center gap-4 text-xs font-mono pl-11 mt-4">
            <span className="text-zinc-500">Audit ID:</span>
            <div className="flex items-center gap-1.5 group/id">
              <span className="text-zinc-400 font-bold">{shortId(scanId)}</span>
              <button onClick={copyIdToClipboard} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                {idCopied ? <CheckCircle2 className="h-3 w-3 text-[#22c55e]" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <Badge className="bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-md px-2 py-0 text-[9px] uppercase font-bold tracking-widest">
              Authenticated
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={generating} className="bg-[#22c55e] text-black hover:bg-[#16a34a] h-11 px-6 rounded-xl font-bold active:scale-95 transition-all">
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Export Report
                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0c0d0e] border-white/10 text-zinc-300 shadow-2xl p-1 w-56">
              <DropdownMenuItem onClick={() => handleExport("cyclonedx")} className="cursor-pointer focus:bg-white/5 py-2.5 px-3 rounded-md transition-colors text-xs font-semibold">
                <FileText className="mr-2 h-4 w-4 text-zinc-500" />
                Download CycloneDX JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("spdx")} className="cursor-pointer focus:bg-white/5 py-2.5 px-3 rounded-md transition-colors text-xs font-semibold">
                <FileText className="mr-2 h-4 w-4 text-zinc-500" />
                Download SPDX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer focus:bg-white/5 py-2.5 px-3 rounded-md transition-colors text-xs font-semibold">
                <FileBarChart2 className="mr-2 h-4 w-4 text-zinc-500" />
                Download PDF Report
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
          { label: 'Inventory Size', value: data.total, icon: Package, border: 'border-l-[#3b82f6]', text: 'text-white' },
          { label: 'Direct Library', value: directDepsCount, icon: Layers, border: 'border-l-[#22c55e]', text: 'text-white' },
          { label: 'Transitive', value: transitiveDepsCount, icon: Layers, border: 'border-l-[#8b5cf6]', text: 'text-white' },
          { label: 'License Spread', value: uniqueLicensesCount, icon: ShieldCheck, border: 'border-l-[#eab308]', text: 'text-white' },
          { label: 'Active Threats', value: vulnData?.summary.critical || 0, icon: ShieldAlert, border: 'border-l-[#ef4444]', text: vulnData?.summary.critical ? 'text-red-500' : 'text-white' },
        ].map((stat, i) => (
          <div key={i} className={cn("group relative rounded-xl border border-white/[0.04] border-l-4 bg-white/[0.01] p-6 transition-all hover:bg-white/[0.02]", stat.border)}>
            <div className="flex items-center gap-2 mb-4">
              <stat.icon className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em]">{stat.label}</span>
            </div>
            <div className={cn("text-2xl font-extrabold tracking-tight", stat.text)}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ECOSYSTEM TABS */}
      {data.ecosystems && data.ecosystems.length > 1 && (
        <div className="flex items-center gap-3 bg-white/[0.01] border border-white/[0.04] p-1 rounded-xl w-fit">
          {['All', ...data.ecosystems].map((eco) => (
            <button
              key={eco}
              onClick={() => setActiveEcosystem(eco)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeEcosystem === eco
                  ? "bg-white/5 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {eco !== 'All' && <EcoDot eco={eco} />}
              {eco}
              <span className="opacity-40 ml-1">
                ({eco === 'All' ? data.total : data.ecosystem_breakdown[eco]?.count || 0})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* TAB SWITCHER */}
      <div className="flex items-center gap-2 p-1 border-b border-white/[0.04] w-full overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('vulnerabilities')}
          className={cn(
            "px-6 py-3 rounded-t-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 relative",
            activeTab === 'vulnerabilities' 
              ? "bg-[#1e2230] text-[#f0f2f8] border-b-2 border-[#22c55e]" 
              : "text-[#4a5068] hover:text-zinc-300"
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Vulnerabilities
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={cn(
            "px-6 py-3 rounded-t-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 relative",
            activeTab === 'compliance' 
              ? "bg-[#1e2230] text-[#f0f2f8] border-b-2 border-[#22c55e]" 
              : "text-[#4a5068] hover:text-zinc-300"
          )}
        >
          <FileBarChart2 className="h-3.5 w-3.5" />
          Compliance
        </button>
        <button
          onClick={() => setActiveTab('bom')}
          className={cn(
            "px-6 py-3 rounded-t-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 relative",
            activeTab === 'bom' 
              ? "bg-[#1e2230] text-[#f0f2f8] border-b-2 border-[#22c55e]" 
              : "text-[#4a5068] hover:text-zinc-300"
          )}
        >
          <Package className="h-3.5 w-3.5" />
          Bill of Materials
        </button>
      </div>

      {activeTab === 'vulnerabilities' && vulnData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Security Findings
            </h2>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-red-500/5 rounded-full flex items-center gap-2 border border-red-500/10">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">{vulnData.summary.critical} Critical</span>
              </div>
              <div className="px-3 py-1 bg-orange-500/5 rounded-full flex items-center gap-2 border border-orange-500/10">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">{vulnData.summary.high} High</span>
              </div>
            </div>
          </div>

          {(vulnData.summary.critical + vulnData.summary.high + vulnData.summary.medium + vulnData.summary.low) === 0 ? (
            <div className="bg-[#22c55e]/[0.02] border border-[#22c55e]/10 text-[#22c55e] p-8 rounded-2xl flex items-center gap-6">
              <div className="h-12 w-12 rounded-2xl bg-[#22c55e]/10 flex items-center justify-center border border-[#22c55e]/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-white mb-1">Authenticated Environment Clean</p>
                <p className="text-xs opacity-60">No vulnerabilities detected matching the specified inventory baseline.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.04] bg-[#0c0d0e] overflow-x-auto shadow-2xl">
              <Table>
                <TableHeader className="bg-white/[0.01]">
                  <TableRow className="border-white/[0.04]">
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold py-4">Component</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold py-4">Reference</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold text-center py-4">Severity</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold py-4">Mitigation</TableHead>
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
                        <span className="text-[11px] font-mono text-[#22c55e] bg-[#22c55e]/5 px-2 py-0.5 rounded border border-[#22c55e]/10">{v.cve_id}</span>
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
                          <div className="flex items-center gap-2 text-[#22c55e]">
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

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {!complianceData ? (
             <div className="flex h-32 items-center justify-center border border-white/[0.04] rounded-2xl bg-card">
               <span className="text-zinc-500 text-sm">Compliance data unavailable.</span>
             </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Score Card */}
                <div className="bg-[#0c0d0e] border border-white/[0.04] rounded-2xl p-8 flex-1 flex flex-col items-center justify-center shadow-xl">
                  <div className="relative mb-6">
                     <svg className="w-32 h-32 transform -rotate-90">
                       <circle cx="64" cy="64" r="56" className="stroke-white/[0.05]" strokeWidth="10" fill="none" />
                       <circle cx="64" cy="64" r="56" 
                         className={cn(
                           "transition-all duration-1000 ease-out",
                           complianceData.ntia.score === 100 ? "stroke-[#22c55e]" :
                           complianceData.ntia.score >= 60 ? "stroke-orange-500" : "stroke-red-500"
                         )}
                         strokeWidth="10" fill="none"
                         strokeDasharray="351.858"
                         strokeDashoffset={351.858 - (351.858 * complianceData.ntia.score) / 100}
                         strokeLinecap="round"
                       />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold text-white">{complianceData.ntia.score}</span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">NTIA Score</span>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border text-center",
                      complianceData.ntia.compliant ? "bg-[#22c55e]/5 border-[#22c55e]/10 text-[#22c55e]" : "bg-red-500/5 border-red-500/10 text-red-400"
                    )}>
                      <span className="text-[9px] font-bold uppercase tracking-widest mb-1">NTIA EO14028</span>
                      <span className="text-xs font-bold">{complianceData.ntia.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}</span>
                    </div>
                    <div className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border text-center",
                      complianceData.eu_cra_compliant ? "bg-[#22c55e]/5 border-[#22c55e]/10 text-[#22c55e]" : "bg-red-500/5 border-red-500/10 text-red-400"
                    )}>
                      <span className="text-[9px] font-bold uppercase tracking-widest mb-1">EU CRA</span>
                      <span className="text-xs font-bold">{complianceData.eu_cra_compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}</span>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {complianceData.ntia.recommendations.length > 0 && (
                   <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-8 flex-1 shadow-xl">
                      <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <h3 className="text-white font-bold text-lg">Remediation Steps</h3>
                      </div>
                      <ul className="space-y-4">
                        {complianceData.ntia.recommendations.map((rec, i) => (
                           <li key={i} className="text-sm text-zinc-400 flex items-start gap-3">
                             <div className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                             <span>{rec}</span>
                           </li>
                        ))}
                      </ul>
                   </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bom' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Package className="h-4 w-4 text-zinc-600" />
              Bill of Materials
            </h2>
            <div className="relative w-[360px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 group-focus-within:text-[#22c55e] transition-colors" />
              <Input
                placeholder="Search library, license or version..."
                className="pl-11 bg-white/[0.02] border-white/10 text-white h-11 rounded-xl focus:border-[#22c55e] focus:ring-0 text-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* MANIFEST FILES LIST */}
          {data.manifest_files && data.manifest_files.length > 0 && (
            <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl overflow-hidden">
              <button 
                onClick={() => toggleElement('manifests')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-zinc-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Manifest Files Found ({data.manifest_files.length})</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-zinc-600 transition-transform", expandedElements['manifests'] && "rotate-180")} />
              </button>
              {expandedElements['manifests'] && (
                <div className="p-4 pt-0 space-y-2 border-t border-white/[0.04]">
                  {data.manifest_files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                      <div className="flex items-center gap-3">
                        <FileText className="h-3.5 w-3.5 text-zinc-600" />
                        <span className="text-xs text-zinc-300 font-mono">{file.path}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter bg-zinc-800 px-1.5 py-0.5 rounded">
                          {file.ecosystem}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-white/[0.04] bg-[#0c0d0e] overflow-x-auto shadow-2xl">
            <Table>
              <TableHeader className="bg-white/[0.01]">
                <TableRow className="border-white/[0.04]">
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold py-4">Component</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold py-4">Release</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold py-4">License</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold py-4">Origin</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold py-4">Manifest</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-6 font-bold py-4 text-right">Depth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-white/[0.04]">
                {filteredComponents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-zinc-600 italic">
                      No components match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComponents.map((c) => (
                    <TableRow key={c.id} className="border-white/[0.04] hover:bg-white/[0.005] transition-colors">
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <EcoDot eco={c.ecosystem} />
                          <div>
                            <p className="font-bold text-zinc-200 text-[13px] mb-0.5">{c.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <code className="text-[10px] text-zinc-400 bg-[#0f1117] border border-[#1e2230] px-2 py-0.5 rounded font-mono font-bold">{c.version}</code>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <LicenseBadge license={c.license} />
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                          {c.ecosystem.toLowerCase()}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px] block" title={c.source_path}>
                          {c.source_path}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-right">
                        {c.depth === 0 ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 uppercase">Direct</span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700/30 uppercase">Transitive</span>
                        )}
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
           <div className="relative bg-[#0c0d0e] border-white/10 rounded-2xl w-full max-w-md p-10 shadow-3xl border animate-in zoom-in-95 duration-200">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#22c55e] to-transparent" />
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Generate Secure Share Link</h2>
              <p className="text-zinc-500 text-xs mb-10 leading-relaxed font-medium">Create a cryptographic link for external compliance auditing. Access does not require authentication.</p>
              
              {!shareLink ? (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 block px-1">Label (Optional)</label>
                    <Input 
                      placeholder='e.g. "For DRDO Audit"' 
                      className="bg-white/[0.02] border-white/10 text-white h-12 rounded-xl focus:border-[#22c55e] focus:ring-0"
                      value={shareLabel}
                      onChange={(e) => setShareLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 block px-1">Expires In</label>
                    <select 
                      className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-xl px-4 text-xs font-bold text-zinc-300 focus:outline-none focus:border-[#22c55e] appearance-none cursor-pointer"
                      value={shareExpires}
                      onChange={(e) => setShareExpires(Number(e.target.value))}
                    >
                      <option value={30}>30 Days</option>
                      <option value={60}>60 Days</option>
                      <option value={90}>90 Days</option>
                      <option value={180}>180 Days</option>
                    </select>
                  </div>
                  <div className="pt-6 flex gap-4">
                    <Button variant="ghost" className="flex-1 text-zinc-500 hover:text-white font-bold h-11" onClick={() => setShowShareModal(false)}>Cancel</Button>
                    <Button className="flex-1 bg-[#22c55e] text-black hover:bg-[#16a34a] h-11 font-bold rounded-xl" onClick={handleCreateShare} disabled={sharing || !lastSbomId}>
                      {sharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate Link
                    </Button>
                  </div>
                  {!lastSbomId && (
                    <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-500/70 leading-relaxed font-medium">Generate an artifact (CycloneDX/SPDX) first to enable sharing.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-[#22c55e]/5 border border-[#22c55e]/10 p-5 rounded-2xl text-[#22c55e] flex gap-4">
                    <Globe className="h-6 w-6 shrink-0 opacity-60" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-1">Secure Link Active</p>
                      <p className="text-[10px] leading-relaxed opacity-70">This link works without login. Share with authorized auditors only.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 relative group">
                    <Input readOnly value={shareLink} className="font-mono text-[10px] bg-white/[0.01] border-white/10 h-12 pr-24 rounded-xl text-zinc-400" />
                    <Button onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }} className="absolute right-1 top-1 h-10 w-20 bg-white text-black hover:bg-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <Button variant="ghost" className="w-full text-zinc-600 hover:text-zinc-300 h-12 font-bold uppercase tracking-widest text-[10px]" onClick={() => setShowShareModal(false)}>Close</Button>
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
